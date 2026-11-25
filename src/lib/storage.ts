import { SEED_ITEMS } from "@/data/items";
import type { Category, Item, ItemStatus } from "@/types/item";

const STORAGE_KEY = "homestock.items.v1";

const VALID_CATEGORIES = new Set<Category>([
  "kitchen",
  "bathroom",
  "pet",
  "other",
]);
const VALID_STATUSES = new Set<ItemStatus>(["green", "yellow", "red"]);

const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedItems: Item[] = SEED_ITEMS;

function isValidItem(value: unknown): value is Item {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.id === "string" &&
    record.id.length > 0 &&
    typeof record.name === "string" &&
    record.name.trim().length > 0 &&
    typeof record.category === "string" &&
    VALID_CATEGORIES.has(record.category as Category) &&
    typeof record.status === "string" &&
    VALID_STATUSES.has(record.status as ItemStatus) &&
    typeof record.defaultQty === "number" &&
    Number.isFinite(record.defaultQty) &&
    record.defaultQty >= 1 &&
    typeof record.lastRestockedAt === "string" &&
    (record.amazonAsin === undefined || typeof record.amazonAsin === "string")
  );
}

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export function subscribeItems(listener: () => void): () => void {
  listeners.add(listener);

  if (typeof window === "undefined") {
    return () => {
      listeners.delete(listener);
    };
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === null || event.key === STORAGE_KEY) {
      cachedRaw = undefined;
      listener();
    }
  }

  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function getServerItemsSnapshot(): Item[] {
  return SEED_ITEMS;
}

/**
 * Read items from localStorage with referential caching for useSyncExternalStore.
 * Seeds default items only on first visit when storage is empty.
 */
export function getItemsSnapshot(): Item[] {
  if (typeof window === "undefined") return SEED_ITEMS;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) {
      const serialized = JSON.stringify(SEED_ITEMS);
      window.localStorage.setItem(STORAGE_KEY, serialized);
      cachedRaw = serialized;
      cachedItems = SEED_ITEMS;
      return cachedItems;
    }

    if (raw === cachedRaw) {
      return cachedItems;
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      const serialized = JSON.stringify(SEED_ITEMS);
      window.localStorage.setItem(STORAGE_KEY, serialized);
      cachedRaw = serialized;
      cachedItems = SEED_ITEMS;
      return cachedItems;
    }

    cachedRaw = raw;
    cachedItems = parsed.filter(isValidItem);
    return cachedItems;
  } catch {
    return SEED_ITEMS;
  }
}

export function saveItems(items: Item[]): void {
  if (typeof window === "undefined") return;

  try {
    const serialized = JSON.stringify(items);
    window.localStorage.setItem(STORAGE_KEY, serialized);
    cachedRaw = serialized;
    cachedItems = items;
  } catch {
    // Ignore storage quota / privacy mode errors
  }

  emitChange();
}
