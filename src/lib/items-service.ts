import { DEFAULT_SEED_ITEMS } from "@/data/items";
import { getSupabaseClient } from "@/lib/supabase";
import type { Category, Item, ItemStatus } from "@/types/item";

export type ItemRow = {
  id: string;
  household_id: string;
  name: string;
  category: string;
  status: string;
  amazon_asin: string | null;
  default_qty: number | null;
  last_restocked_at: string | null;
};

export type UpsertItemInput = {
  name: string;
  category: Category;
  status: ItemStatus;
  amazonAsin?: string;
  defaultQty: number;
};

const VALID_CATEGORIES = new Set<Category>([
  "kitchen",
  "bathroom",
  "pet",
  "other",
]);
const VALID_STATUSES = new Set<ItemStatus>(["green", "yellow", "red"]);

const inFlightSeeds = new Map<string, Promise<Item[]>>();

function normalizeCategory(value: string): Category {
  return VALID_CATEGORIES.has(value as Category)
    ? (value as Category)
    : "other";
}

function normalizeStatus(value: string): ItemStatus {
  return VALID_STATUSES.has(value as ItemStatus)
    ? (value as ItemStatus)
    : "green";
}

export function rowToItem(row: ItemRow): Item {
  const qty =
    typeof row.default_qty === "number" && Number.isFinite(row.default_qty)
      ? Math.max(1, Math.min(99, Math.round(row.default_qty)))
      : 1;

  return {
    id: row.id,
    householdId: row.household_id,
    name: row.name,
    category: normalizeCategory(row.category),
    status: normalizeStatus(row.status),
    amazonAsin: row.amazon_asin?.trim() ? row.amazon_asin.trim().toUpperCase() : undefined,
    defaultQty: qty,
    lastRestockedAt: row.last_restocked_at || new Date().toISOString(),
  };
}

function formatSupabaseError(error: { code?: string; message?: string }): Error {
  if (error.code === "42501") {
    return new Error(
      "Supabase 数据表 items 暂无匿名读写权限（42501），请检查 RLS 策略与 anon 授权。",
    );
  }
  return new Error(error.message || "云端同步失败，请稍后重试。");
}

function createUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (char) => {
    const rand = Math.floor(Math.random() * 16);
    const value = char === "x" ? rand : (rand & 0x3) | 0x8;
    return value.toString(16);
  });
}

async function seedHouseholdItems(householdId: string): Promise<Item[]> {
  const existingPromise = inFlightSeeds.get(householdId);
  if (existingPromise) {
    return existingPromise;
  }

  const seedPromise = (async () => {
    const supabase = getSupabaseClient();
    const now = Date.now();
    const rowsToInsert = DEFAULT_SEED_ITEMS.map((seed) => ({
      id: createUuid(),
      household_id: householdId,
      name: seed.name,
      category: seed.category,
      status: seed.status,
      amazon_asin: seed.amazonAsin ?? null,
      default_qty: seed.defaultQty,
      last_restocked_at: new Date(
        now - seed.daysAgo * 24 * 60 * 60 * 1000,
      ).toISOString(),
    }));

    const { data, error } = await supabase
      .from("items")
      .insert(rowsToInsert)
      .select("*");

    if (error) {
      throw formatSupabaseError(error);
    }

    return (data as ItemRow[]).map(rowToItem);
  })();

  inFlightSeeds.set(householdId, seedPromise);
  try {
    return await seedPromise;
  } finally {
    inFlightSeeds.delete(householdId);
  }
}

export async function loadHouseholdItems(householdId: string): Promise<Item[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("household_id", householdId);

  if (error) {
    throw formatSupabaseError(error);
  }

  if (!data || data.length === 0) {
    return seedHouseholdItems(householdId);
  }

  return (data as ItemRow[]).map(rowToItem);
}

export async function createHouseholdItem(
  householdId: string,
  input: UpsertItemInput,
): Promise<Item> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("items")
    .insert({
      id: createUuid(),
      household_id: householdId,
      name: input.name,
      category: input.category,
      status: input.status,
      amazon_asin: input.amazonAsin ?? null,
      default_qty: input.defaultQty,
      last_restocked_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) {
    throw formatSupabaseError(error);
  }

  return rowToItem(data as ItemRow);
}

export async function updateHouseholdItem(
  householdId: string,
  id: string,
  patch: Partial<UpsertItemInput> & { lastRestockedAt?: string },
): Promise<Item> {
  const supabase = getSupabaseClient();
  const updates: Record<string, unknown> = {};

  if (patch.name !== undefined) updates.name = patch.name;
  if (patch.category !== undefined) updates.category = patch.category;
  if (patch.status !== undefined) updates.status = patch.status;
  if ("amazonAsin" in patch) updates.amazon_asin = patch.amazonAsin ?? null;
  if (patch.defaultQty !== undefined) updates.default_qty = patch.defaultQty;
  if (patch.lastRestockedAt !== undefined) {
    updates.last_restocked_at = patch.lastRestockedAt;
  }

  const { data, error } = await supabase
    .from("items")
    .update(updates)
    .eq("id", id)
    .eq("household_id", householdId)
    .select("*")
    .single();

  if (error) {
    throw formatSupabaseError(error);
  }

  return rowToItem(data as ItemRow);
}

export async function deleteHouseholdItem(
  householdId: string,
  id: string,
): Promise<void> {
  const supabase = getSupabaseClient();
  const { error } = await supabase
    .from("items")
    .delete()
    .eq("id", id)
    .eq("household_id", householdId);

  if (error) {
    throw formatSupabaseError(error);
  }
}

export async function markHouseholdItemsRestocked(
  householdId: string,
  ids: string[],
  restockedAt: string,
): Promise<Item[]> {
  if (ids.length === 0) return [];

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from("items")
    .update({
      status: "green",
      last_restocked_at: restockedAt,
    })
    .eq("household_id", householdId)
    .in("id", ids)
    .select("*");

  if (error) {
    throw formatSupabaseError(error);
  }

  return (data as ItemRow[]).map(rowToItem);
}
