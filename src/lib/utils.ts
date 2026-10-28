/** Format a number as Indian rupees. */
export const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/** Stock label + badge colours used by cards and the orders page. */
export function stockStatus(quantity?: number | null) {
  if (quantity === null || quantity === undefined) return null;
  if (quantity <= 0) return { text: "Out of stock", style: "bg-red-50 text-red-700" };
  if (quantity <= 5) return { text: `Only ${quantity} left`, style: "bg-amber-50 text-amber-700" };
  return { text: "In stock", style: "bg-emerald-50 text-emerald-700" };
}

/** Turn an error into a message a person can act on. */
export function describeError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/** Is this product visible and orderable in the store? */
export function isSellable(item: { published?: boolean; sellingPrice?: number | null; quantity?: number | null }) {
  return item.published !== false && (item.sellingPrice ?? 0) > 0 && typeof item.quantity === "number";
}

export function formatDate(timestamp?: number) {
  if (!timestamp) return "—";
  return new Date(timestamp).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
