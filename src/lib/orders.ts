import { apiFetch } from "@/lib/api";
import { auth } from "@/lib/firebase";
import type { InventoryItem, Order } from "@/lib/types";

export type CartLine = { item: InventoryItem; quantity: number };

export type CheckoutDetails = {
  companyName: string;
  gstin: string;
  customerName: string; // contact person
  phone: string;
  email: string;
  address: string;
  notes: string;
};

/**
 * Only product ids and quantities are sent. The server looks up the real price and stock,
 * so nobody can change a price from the browser.
 */
export async function placeOrder(lines: CartLine[], details: CheckoutDetails): Promise<Order> {
  const { order } = await apiFetch<{ order: Order }>("/api/orders", {
    method: "POST",
    body: { lines: lines.map((l) => ({ itemId: l.item.id, quantity: l.quantity })), details },
  });
  return order;
}

const act = (order: Order, action: "confirm" | "cancel" | "deliver") =>
  apiFetch<{ order: Order }>(`/api/orders/${order.id}`, { method: "PATCH", body: { action } }).then((r) => r.order);

/** Customer: cancel own order while it is still "Placed". Stock goes back automatically. */
export const cancelOwnOrder = (order: Order) => act(order, "cancel");

/** Store staff */
export const confirmOrder = (order: Order) => act(order, "confirm");
export const cancelOrderAsStaff = (order: Order) => act(order, "cancel");
export const markDelivered = (order: Order) => act(order, "deliver");

/**
 * Download all orders as an Excel file (.xlsx). The browser saves it directly.
 * `from` / `to` are YYYY-MM-DD strings; both optional.
 */
export async function downloadOrdersExcel(from?: string, to?: string) {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in again.");
  const token = await user.getIdToken();

  const qs = new URLSearchParams();
  if (from) qs.set("from", from);
  if (to) qs.set("to", to);

  let res: Response;
  try {
    res = await fetch(`/api/orders/export?${qs}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    throw new Error("Cannot reach the server. Check your internet connection and try again.");
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.error ?? "Could not create the Excel file. Please try again.");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? "orders.xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
