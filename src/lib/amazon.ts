import { isValidAsin } from "@/lib/asin";
import type { Item } from "@/types/item";

export type AmazonCartPlan = {
  url: string | null;
  boundItems: Item[];
  unboundCount: number;
};

const AMAZON_BATCH_CART_BASE = "https://www.amazon.com/gp/aws/cart/add.html";

/**
 * Build an Amazon multi-item Add-to-Cart URL from restock target items.
 * Format: https://www.amazon.com/gp/aws/cart/add.html?ASIN.1={asin1}&Quantity.1={qty1}&...
 */
export function buildAmazonBatchCartUrl(targetItems: Item[]): AmazonCartPlan {
  const boundItems: Item[] = [];
  let unboundCount = 0;

  for (const item of targetItems) {
    const asin = item.amazonAsin?.trim().toUpperCase();
    if (asin && isValidAsin(asin)) {
      boundItems.push({ ...item, amazonAsin: asin });
    } else {
      unboundCount += 1;
    }
  }

  if (boundItems.length === 0) {
    return {
      url: null,
      boundItems,
      unboundCount,
    };
  }

  const params = boundItems
    .map((item, index) => {
      const slot = index + 1;
      const qty = Math.max(1, Math.min(99, Math.round(item.defaultQty || 1)));
      return `ASIN.${slot}=${encodeURIComponent(item.amazonAsin!)}&Quantity.${slot}=${qty}`;
    })
    .join("&");

  return {
    url: `${AMAZON_BATCH_CART_BASE}?${params}`,
    boundItems,
    unboundCount,
  };
}
