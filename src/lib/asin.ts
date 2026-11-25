const ASIN_PATTERN = /^[A-Z0-9]{10}$/;
const AMAZON_URL_ASIN_PATTERN =
  /\/(?:dp|gp\/product|gp\/aw\/d)\/([A-Za-z0-9]{10})(?=[/?&#]|$)/i;

/**
 * Extract a 10-character Amazon ASIN from a full Amazon product URL or direct ASIN input.
 */
export function extractAsin(raw: string): {
  asin: string | null;
  fromUrl: boolean;
} {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { asin: null, fromUrl: false };
  }

  const urlMatch = trimmed.match(AMAZON_URL_ASIN_PATTERN);
  if (urlMatch?.[1]) {
    return { asin: urlMatch[1].toUpperCase(), fromUrl: true };
  }

  const upper = trimmed.toUpperCase();
  if (ASIN_PATTERN.test(upper)) {
    return { asin: upper, fromUrl: false };
  }

  return { asin: null, fromUrl: false };
}

export function isValidAsin(value: string): boolean {
  return ASIN_PATTERN.test(value.trim().toUpperCase());
}
