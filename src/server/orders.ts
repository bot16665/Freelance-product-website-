import { randomInt, randomUUID } from "node:crypto";
import { getDb } from "./db";
import { badRequest, HttpError, text } from "./http";
import type { SessionUser } from "./auth";
import type { Order, OrderLine, OrderStatus } from "@/lib/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const ORDER_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

function toOrder(r: Row, lines: Row[]): Order {
  const items: OrderLine[] = lines.map((l) => ({
    itemId: l.product_id,
    name: l.name,
    ...(l.brand ? { brand: l.brand } : {}),
    ...(l.image ? { image: l.image } : {}),
    price: l.price,
    quantity: l.quantity,
    lineTotal: l.line_total,
    ...(l.gst_rate !== null ? { gstRate: l.gst_rate } : {}),
  }));
  return {
    id: r.id,
    orderNo: r.order_no,
    invoiceNo: r.invoice_no ?? undefined,
    status: r.status as OrderStatus,
    companyName: r.company_name ?? undefined,
    gstin: r.gstin ?? undefined,
    email: r.email ?? undefined,
    customerName: r.customer_name,
    phone: r.phone,
    address: r.address,
    notes: r.notes ?? "",
    paymentMethod: r.payment_method,
    items,
    totalItems: r.total_items,
    total: r.total,
    buyerId: r.buyer_id,
    buyerEmail: r.buyer_email ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? undefined,
  };
}

function loadOrders(rows: Row[]): Order[] {
  if (rows.length === 0) return [];
  const db = getDb();
  const marks = rows.map(() => "?").join(",");
  const lines = db
    .prepare(`SELECT * FROM order_items WHERE order_id IN (${marks}) ORDER BY id`)
    .all(...rows.map((r) => r.id)) as Row[];
  const byOrder = new Map<string, Row[]>();
  for (const l of lines) byOrder.set(l.order_id, [...(byOrder.get(l.order_id) ?? []), l]);
  return rows.map((r) => toOrder(r, byOrder.get(r.id) ?? []));
}

export function listOrders(scope: "mine" | "all", uid: string) {
  const db = getDb();
  const rows =
    scope === "all"
      ? (db.prepare("SELECT * FROM orders ORDER BY created_at DESC LIMIT 500").all() as Row[])
      : (db.prepare("SELECT * FROM orders WHERE buyer_id = ? ORDER BY created_at DESC LIMIT 500").all(uid) as Row[]);
  return loadOrders(rows);
}

export function getOrder(id: string) {
  const row = getDb().prepare("SELECT * FROM orders WHERE id = ?").get(id) as Row | undefined;
  return row ? loadOrders([row])[0] : null;
}

/* ------------------------------ place order ------------------------------ */

function parseDetails(raw: unknown) {
  if (!raw || typeof raw !== "object") throw badRequest("Order details are missing.");
  const d = raw as Record<string, unknown>;

  const companyName = text(d.companyName, 120, "Company name", true) as string;
  const customerName = text(d.customerName, 100, "Contact person", true) as string;
  const phone = text(d.phone, 10, "Mobile number", true) as string;
  if (!/^\d{10}$/.test(phone)) throw badRequest("Enter a valid 10-digit mobile number.");
  const address = text(d.address, 300, "Address", true) as string;
  if (address.length < 10) throw badRequest("Please enter a complete address.");

  const gstin = text(d.gstin, 15, "GSTIN")?.toUpperCase() ?? null;
  if (gstin && !GSTIN.test(gstin)) throw badRequest("Enter a valid 15-character GSTIN, or leave it empty.");
  const email = text(d.email, 120, "Email");
  if (email && !/^\S+@\S+\.\S+$/.test(email)) throw badRequest("Enter a valid email address.");

  return { companyName, customerName, phone, address, gstin, email, notes: text(d.notes, 500, "Notes") };
}

function parseLines(raw: unknown) {
  if (!Array.isArray(raw) || raw.length === 0) throw badRequest("Your cart is empty.");
  if (raw.length > 50) throw badRequest("Too many different products in one order.");
  const merged = new Map<string, number>();
  for (const l of raw) {
    const itemId = typeof l?.itemId === "string" ? l.itemId : "";
    const quantity = Number(l?.quantity);
    if (!itemId || !Number.isInteger(quantity) || quantity < 1 || quantity > 10000) {
      throw badRequest("Invalid quantity in your cart.");
    }
    merged.set(itemId, (merged.get(itemId) ?? 0) + quantity);
  }
  return [...merged].map(([itemId, quantity]) => ({ itemId, quantity }));
}

/**
 * Prices, GST and stock all come from the database, never from the browser, so a customer
 * cannot change a price. Stock is reserved straight away (and returned if the order is cancelled).
 */
export function placeOrder(user: SessionUser, body: Record<string, unknown>): Order {
  const lines = parseLines(body.lines);
  const d = parseDetails(body.details);
  const db = getDb();

  const run = db.transaction(() => {
    const now = Date.now();
    const id = randomUUID();
    let orderNo = "";
    for (let i = 0; i < 10; i++) {
      const candidate = "ORD-" + Array.from({ length: 6 }, () => ORDER_CHARS[randomInt(ORDER_CHARS.length)]).join("");
      if (!db.prepare("SELECT 1 FROM orders WHERE order_no = ?").get(candidate)) {
        orderNo = candidate;
        break;
      }
    }
    if (!orderNo) throw new HttpError(500, "Could not create an order number. Please try again.");

    const reserve = db.prepare(
      `UPDATE products SET quantity = quantity - ?, updated_at = ?
       WHERE id = ? AND published = 1 AND selling_price > 0 AND quantity >= ?`
    );
    const find = db.prepare("SELECT * FROM products WHERE id = ?");

    const priced: { p: Row; quantity: number; lineTotal: number }[] = [];
    for (const { itemId, quantity } of lines) {
      const p = find.get(itemId) as Row | undefined;
      if (!p || p.published !== 1 || !(p.selling_price > 0)) {
        throw new HttpError(409, `${p?.name ?? "A product in your cart"} is no longer available. Please refresh the store.`);
      }
      if (reserve.run(quantity, now, itemId, quantity).changes !== 1) {
        const left = (find.get(itemId) as Row).quantity ?? 0;
        throw new HttpError(
          409,
          left > 0 ? `Only ${left} of ${p.name} left in stock.` : `${p.name} is out of stock.`
        );
      }
      priced.push({ p, quantity, lineTotal: round2(p.selling_price * quantity) });
    }

    const total = round2(priced.reduce((s, x) => s + x.lineTotal, 0));
    const totalItems = priced.reduce((s, x) => s + x.quantity, 0);
    const suffix = orderNo.replace("ORD-", "");

    db.prepare(
      `INSERT INTO orders (id, order_no, invoice_no, status, company_name, gstin, email, customer_name, phone, address,
         notes, payment_method, total_items, total, buyer_id, buyer_email, created_at, updated_at)
       VALUES (?, ?, ?, 'Placed', ?, ?, ?, ?, ?, ?, ?, 'Cash on Delivery', ?, ?, ?, ?, ?, ?)`
    ).run(
      id, orderNo, `INV-${new Date(now).getFullYear()}-${suffix}`, d.companyName, d.gstin, d.email, d.customerName,
      d.phone, d.address, d.notes, totalItems, total, user.uid, user.email, now, now
    );

    const insertLine = db.prepare(
      `INSERT INTO order_items (order_id, product_id, name, brand, image, price, quantity, line_total, gst_rate)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const { p, quantity, lineTotal } of priced) {
      insertLine.run(id, p.id, p.name, p.brand, p.main_image, p.selling_price, quantity, lineTotal, p.gst_rate ?? 18);
    }
    return id;
  });

  return getOrder(run()) as Order;
}

/* ------------------------------ status changes ------------------------------ */

export type OrderAction = "confirm" | "cancel" | "deliver";

export function changeStatus(id: string, action: OrderAction, user: SessionUser): Order {
  const db = getDb();

  const run = db.transaction(() => {
    const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(id) as Row | undefined;
    if (!order) throw new HttpError(404, "Order not found.");

    const isStaff = user.role === "seller";
    if (!isStaff) {
      // customers: only their own order, and only cancel while it is still waiting
      if (order.buyer_id !== user.uid) throw new HttpError(404, "Order not found.");
      if (action !== "cancel" || order.status !== "Placed") {
        throw new HttpError(403, "You can only cancel an order before the store confirms it.");
      }
    }

    const transitions: Record<OrderAction, { from: OrderStatus[]; to: OrderStatus }> = {
      confirm: { from: ["Placed"], to: "Confirmed" },
      deliver: { from: ["Confirmed"], to: "Delivered" },
      cancel: { from: ["Placed", "Confirmed"], to: "Cancelled" },
    };
    const t = transitions[action];
    if (!t) throw badRequest("Unknown action.");
    if (!t.from.includes(order.status)) {
      throw new HttpError(409, `This order is already ${order.status.toLowerCase()}.`);
    }

    // The status condition makes sure two people can never cancel (and restock) the same order twice
    const res = db
      .prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ? AND status = ?")
      .run(t.to, Date.now(), id, order.status);
    if (res.changes !== 1) throw new HttpError(409, "This order was just changed by someone else. Refresh and try again.");

    if (action === "cancel") {
      const lines = db.prepare("SELECT product_id, quantity FROM order_items WHERE order_id = ?").all(id) as Row[];
      const restock = db.prepare("UPDATE products SET quantity = COALESCE(quantity, 0) + ?, updated_at = ? WHERE id = ?");
      for (const l of lines) restock.run(l.quantity, Date.now(), l.product_id);
    }
  });

  run();
  return getOrder(id) as Order;
}
