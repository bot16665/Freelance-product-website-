import type { Order } from "@/lib/types";
import { SELLER } from "@/lib/company";

export const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

export type InvoiceLine = {
  name: string;
  brand?: string;
  quantity: number;
  rate: number; // unit price excluding GST
  taxable: number;
  gstRate: number;
  tax: number;
  amount: number; // taxable + tax (what the customer pays for this line)
};

export type InvoiceData = {
  invoiceNo: string;
  lines: InvoiceLine[];
  taxable: number;
  igst: boolean; // true = different states, so IGST; false = CGST + SGST
  tax: number;
  cgst: number;
  sgst: number;
  total: number;
};

/** Order total, always recomputed from the lines. */
export const orderTotal = (order: Order) =>
  round2(order.items.reduce((sum, l) => sum + l.price * l.quantity, 0));

/** Invoice number for an order (old orders without one get a matching number). */
export function invoiceNumber(order: Order) {
  if (order.invoiceNo) return order.invoiceNo;
  const year = new Date(order.createdAt || Date.now()).getFullYear();
  return `INV-${year}-${order.orderNo.replace(/^ORD-/, "")}`;
}

/**
 * Item prices are GST-inclusive (like an MRP), so the order total never changes.
 * The invoice splits each line into taxable value + GST.
 */
export function buildInvoice(order: Order): InvoiceData {
  const lines: InvoiceLine[] = order.items.map((l) => {
    const gstRate = typeof l.gstRate === "number" && l.gstRate >= 0 ? l.gstRate : 18;
    const amount = round2(l.price * l.quantity); // recomputed, never trust a stored total
    const taxable = round2(amount / (1 + gstRate / 100));
    return {
      name: l.name,
      brand: l.brand,
      quantity: l.quantity,
      rate: round2(taxable / l.quantity),
      taxable,
      gstRate,
      tax: round2(amount - taxable),
      amount,
    };
  });

  const taxable = round2(lines.reduce((s, l) => s + l.taxable, 0));
  const total = round2(lines.reduce((s, l) => s + l.amount, 0));
  const tax = round2(total - taxable);

  const sellerState = SELLER.gstin.slice(0, 2);
  const buyerState = (order.gstin ?? "").slice(0, 2);
  const igst = /^\d{2}$/.test(buyerState) && /^\d{2}$/.test(sellerState) && buyerState !== sellerState;

  const cgst = igst ? 0 : round2(tax / 2);
  const sgst = igst ? 0 : round2(tax - cgst);

  return { invoiceNo: invoiceNumber(order), lines, taxable, igst, tax, cgst, sgst, total };
}

/* ---------------------------- amount in words ---------------------------- */

const ONES = [
  "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven",
  "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function below1000(n: number): string {
  const parts: string[] = [];
  if (n >= 100) {
    parts.push(`${ONES[Math.floor(n / 100)]} Hundred`);
    n %= 100;
  }
  if (n >= 20) {
    parts.push(TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : ""));
  } else if (n > 0) {
    parts.push(ONES[n]);
  }
  return parts.join(" ");
}

function wholeInWords(n: number): string {
  if (n === 0) return "Zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(`${below1000(crore)} Crore`);
  if (lakh) parts.push(`${below1000(lakh)} Lakh`);
  if (thousand) parts.push(`${below1000(thousand)} Thousand`);
  if (n) parts.push(below1000(n));
  return parts.join(" ");
}

/** 12345.5 -> "Rupees Twelve Thousand Three Hundred Forty Five and Fifty Paise Only" */
export function amountInWords(amount: number): string {
  const rupees = Math.floor(amount);
  const paise = Math.round((amount - rupees) * 100);
  let text = `Rupees ${wholeInWords(rupees)}`;
  if (paise) text += ` and ${wholeInWords(paise)} Paise`;
  return `${text} Only`;
}
