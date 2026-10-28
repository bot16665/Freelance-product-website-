import { apiFetch } from "@/lib/api";
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
