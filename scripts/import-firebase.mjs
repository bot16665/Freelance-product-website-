// Copies your OLD Firebase Realtime Database data (products + orders) into the Turso database.
//
// 1. Firebase console -> Realtime Database -> Data -> (three dots menu) -> "Export JSON"
// 2. Run:  npm run import:firebase -- path/to/your-export.json
//
// Safe to run more than once: existing rows are replaced, nothing is duplicated.
// Uses TURSO_DATABASE_URL (e.g. libsql://your-db.turso.io) and TURSO_AUTH_TOKEN if set.
import fs from "node:fs";
import { createClient } from "@libsql/client";

const SCHEMA_URL = new URL("../src/server/schema.ts", import.meta.url);
// .mjs script can't import TS directly; pull the SCHEMA string out of the TS source.
const SCHEMA = /export const SCHEMA = `([\s\S]*?)`;/.exec(fs.readFileSync(SCHEMA_URL, "utf8"))?.[1];
if (!SCHEMA) {
  console.error("Could not read SCHEMA from src/server/schema.ts");
  process.exit(1);
}

const file = process.argv[2];
if (!file || !fs.existsSync(file)) {
  console.error("Usage: npm run import:firebase -- path/to/firebase-export.json");
  process.exit(1);
}

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  console.error("Set TURSO_DATABASE_URL (and TURSO_AUTH_TOKEN for hosted Turso) first.");
  process.exit(1);
}
const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
await db.executeMultiple(SCHEMA);

const data = JSON.parse(fs.readFileSync(file, "utf8"));
const items = data.items ?? {};
const orders = data.orders ?? {};

const text = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
const numOrNull = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const category = (c) => (!c || c === "Printers" ? "General" : String(c)); // the store is no longer printer-only

let p = 0, o = 0, skipped = 0;
const statements = [];

for (const [id, v] of Object.entries(items)) {
  if (!v || typeof v !== "object" || !text(v.itemName)) { skipped++; continue; }
  const urls = Array.isArray(v.imageUrls) ? v.imageUrls.filter((u) => typeof u === "string") : [];
  statements.push({
    sql: `INSERT INTO products (id, name, brand, manufacturer, category, purchase_date, warranty_expiry, status, notes,
      selling_price, quantity, published, country_of_origin, gst_rate, warranty, packer_details, main_image, image_urls,
      created_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name = excluded.name, brand = excluded.brand, manufacturer = excluded.manufacturer,
      category = excluded.category, purchase_date = excluded.purchase_date, warranty_expiry = excluded.warranty_expiry,
      status = excluded.status, notes = excluded.notes, selling_price = excluded.selling_price, quantity = excluded.quantity,
      published = excluded.published, country_of_origin = excluded.country_of_origin, gst_rate = excluded.gst_rate,
      warranty = excluded.warranty, packer_details = excluded.packer_details, main_image = excluded.main_image,
      image_urls = excluded.image_urls, created_by = excluded.created_by, created_at = excluded.created_at,
      updated_at = excluded.updated_at`,
    args: [
      id, text(v.itemName), text(v.companyName), text(v.manufacturer), category(v.category),
      text(v.purchaseDate), text(v.warrantyExpiry), text(v.status), text(v.notes),
      numOrNull(v.sellingPrice), numOrNull(v.quantity), v.published === false ? 0 : 1,
      text(v.countryOfOrigin), numOrNull(v.gstRate), text(v.warranty), text(v.packerDetails),
      text(v.mainImage) ?? urls[0] ?? null, JSON.stringify(urls), text(v.createdBy),
      numOrNull(v.createdAt) ?? Date.now(), numOrNull(v.updatedAt),
    ],
  });
  p++;
}

for (const [id, v] of Object.entries(orders)) {
  const buyer = text(v?.buyerId) ?? text(v?.createdBy); // old orders used "createdBy"
  if (!v || !buyer || !text(v.orderNo)) { skipped++; continue; }
  const lines = Array.isArray(v.items) ? v.items : Object.values(v.items ?? {});
  const total = lines.reduce((s, l) => s + Number(l.price ?? 0) * Number(l.quantity ?? 0), 0);
  statements.push({
    sql: `INSERT INTO orders (id, order_no, invoice_no, status, company_name, gstin, email, customer_name, phone, address,
      notes, payment_method, total_items, total, buyer_id, buyer_email, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET order_no = excluded.order_no, invoice_no = excluded.invoice_no, status = excluded.status,
      company_name = excluded.company_name, gstin = excluded.gstin, email = excluded.email,
      customer_name = excluded.customer_name, phone = excluded.phone, address = excluded.address, notes = excluded.notes,
      payment_method = excluded.payment_method, total_items = excluded.total_items, total = excluded.total,
      buyer_id = excluded.buyer_id, buyer_email = excluded.buyer_email, created_at = excluded.created_at,
      updated_at = excluded.updated_at`,
    args: [
      id, text(v.orderNo), text(v.invoiceNo),
      ["Placed", "Confirmed", "Delivered", "Cancelled"].includes(v.status) ? v.status : "Placed",
      text(v.companyName), text(v.gstin), text(v.email), text(v.customerName) ?? "Customer",
      text(v.phone) ?? "", text(v.address) ?? "", text(v.notes),
      text(v.paymentMethod) ?? "Cash on Delivery",
      lines.reduce((s, l) => s + Number(l.quantity ?? 0), 0),
      Math.round(total * 100) / 100, buyer, text(v.buyerEmail),
      numOrNull(v.createdAt) ?? Date.now(), numOrNull(v.updatedAt),
    ],
  });
  statements.push({ sql: "DELETE FROM order_items WHERE order_id = ?", args: [id] });
  for (const l of lines) {
    statements.push({
      sql: `INSERT INTO order_items (order_id, product_id, name, brand, image, price, quantity, line_total, gst_rate)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id, String(l.itemId ?? ""), text(l.name) ?? "Product", text(l.brand), text(l.image),
        Number(l.price ?? 0), Number(l.quantity ?? 0),
        Number(l.price ?? 0) * Number(l.quantity ?? 0), numOrNull(l.gstRate) ?? 18,
      ],
    });
  }
  o++;
}

if (statements.length) await db.batch(statements, "write");
db.close();
console.log(`Imported ${p} product(s) and ${o} order(s) into ${url}` + (skipped ? ` (${skipped} skipped: incomplete records)` : ""));
