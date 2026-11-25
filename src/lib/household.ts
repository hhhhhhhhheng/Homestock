const HOUSEHOLD_STORAGE_KEY = "homestock.household_id.v1";
const CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const HOUSEHOLD_CODE_PATTERN = /^[A-Z0-9]{6}$/;

const householdListeners = new Set<() => void>();
let cachedHouseholdCode: string | null = null;

function notifyHouseholdListeners() {
  for (const listener of householdListeners) {
    listener();
  }
}

export function normalizeHouseholdCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidHouseholdCode(code: string): boolean {
  return HOUSEHOLD_CODE_PATTERN.test(code);
}

export function generateHouseholdCode(): string {
  let result = "";

  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const bytes = new Uint8Array(CODE_LENGTH);
    crypto.getRandomValues(bytes);
    for (let i = 0; i < CODE_LENGTH; i += 1) {
      result += CODE_CHARSET[bytes[i] % CODE_CHARSET.length];
    }
    return result;
  }

  for (let i = 0; i < CODE_LENGTH; i += 1) {
    result += CODE_CHARSET[Math.floor(Math.random() * CODE_CHARSET.length)];
  }
  return result;
}

export function subscribeHouseholdCode(listener: () => void): () => void {
  householdListeners.add(listener);

  if (typeof window === "undefined") {
    return () => {
      householdListeners.delete(listener);
    };
  }

  function handleStorage(event: StorageEvent) {
    if (event.key === null || event.key === HOUSEHOLD_STORAGE_KEY) {
      cachedHouseholdCode = null;
      listener();
    }
  }

  window.addEventListener("storage", handleStorage);
  return () => {
    householdListeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

export function getServerHouseholdCodeSnapshot(): string {
  return "";
}

export function getHouseholdCodeSnapshot(): string {
  if (typeof window === "undefined") {
    return "";
  }

  if (cachedHouseholdCode && isValidHouseholdCode(cachedHouseholdCode)) {
    return cachedHouseholdCode;
  }

  try {
    const existing = window.localStorage.getItem(HOUSEHOLD_STORAGE_KEY);
    if (existing) {
      const normalized = normalizeHouseholdCode(existing);
      if (isValidHouseholdCode(normalized)) {
        if (normalized !== existing) {
          window.localStorage.setItem(HOUSEHOLD_STORAGE_KEY, normalized);
        }
        cachedHouseholdCode = normalized;
        return normalized;
      }
    }

    const created = generateHouseholdCode();
    window.localStorage.setItem(HOUSEHOLD_STORAGE_KEY, created);
    cachedHouseholdCode = created;
    return created;
  } catch {
    if (!cachedHouseholdCode) {
      cachedHouseholdCode = generateHouseholdCode();
    }
    return cachedHouseholdCode;
  }
}

export function saveHouseholdCode(code: string): string {
  const normalized = normalizeHouseholdCode(code);
  if (!isValidHouseholdCode(normalized)) {
    throw new Error("家庭码需为 6 位大写字母或数字");
  }

  cachedHouseholdCode = normalized;

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(HOUSEHOLD_STORAGE_KEY, normalized);
    } catch {
      // Ignore storage errors in restricted environments
    }
  }

  notifyHouseholdListeners();
  return normalized;
}
