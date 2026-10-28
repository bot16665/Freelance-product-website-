import { get, ref, update } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import type { InventoryItem } from "@/lib/types";

/**
 * Two copies of an item exist:
 *  - items/{id}   = the full record. Only store staff can read it.
 *  - catalog/{id} = only what a customer needs. Every signed-in user can read it.
 * This keeps internal data (purchase date, notes...) away from customers.
 */
export const CATALOG_FIELDS = [
  "itemName",
  "companyName",
  "category",
  "sellingPrice",
  "quantity",
  "gstRate",
  "countryOfOrigin",
  "warranty",
  "mainImage",
  "imageUrls",
  "updatedAt",
] as const;

/** Can this item be shown in the store? */
export function isSellable(item: Partial<InventoryItem>) {
  return item.published !== false && (item.sellingPrice ?? 0) > 0 && typeof item.quantity === "number" && item.quantity >= 0;
}

/** Delete an item from both places in one atomic write. */
export function deleteItem(id: string) {
  return update(ref(rtdb), { [`items/${id}`]: null, [`catalog/${id}`]: null });
}

/** Copy every sellable item into the store (for items added before the store existed). */
export async function publishAll(items: InventoryItem[]) {
  const updates: Record<string, unknown> = {};
  let published = 0;
  let skipped = 0;

  for (const item of items) {
    if (!isSellable(item)) {
      skipped += 1;
      continue;
    }
    const entry: Record<string, unknown> = {};
    for (const f of CATALOG_FIELDS) {
      const v = item[f as keyof InventoryItem];
      if (v !== undefined && v !== null) entry[f] = v;
    }
    updates[`catalog/${item.id}`] = entry;
    published += 1;
  }

  if (published) await update(ref(rtdb), updates);
  return { published, skipped };
}

/** Keep catalog stock equal to the real stock (only if the item is in the store). */
export async function syncCatalogQuantity(itemId: string, quantity: number) {
  const snap = await get(ref(rtdb, `catalog/${itemId}`));
  if (snap.exists()) await update(ref(rtdb), { [`catalog/${itemId}/quantity`]: quantity });
}
