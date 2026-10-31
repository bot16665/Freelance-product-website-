// Sanity checks for every DB write/read/delete operation, run directly against the real DB.
// Usage: node scripts/test-db-ops.mjs  (set TURSO_DATABASE_URL first, e.g. file:./data/test.db)
import fs from "node:fs";
import { createClient } from "@libsql/client";
import { randomUUID } from "node:crypto";

const url = process.env.TURSO_DATABASE_URL ?? "file:./data/test.db";
const db = createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN || undefined });

// apply the schema (same as the app does at startup)
const SCHEMA = /export const SCHEMA = `([\s\S]*?)`;/.exec(
  fs.readFileSync(new URL("../src/server/schema.ts", import.meta.url), "utf8")
)?.[1];
if (!SCHEMA) { console.error("Could not read SCHEMA from src/server/schema.ts"); process.exit(1); }
await db.executeMultiple(SCHEMA);

let pass = 0, fail = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  -> " + extra : ""}`);
  if (ok) pass++; else fail++;
};

const now = Date.now();

/* ---------------- PRODUCTS ---------------- */
// CREATE
const pid = randomUUID();
await db.execute(`INSERT INTO products (id, name, brand, category, selling_price, quantity, published, gst_rate, image_urls, created_by, created_at)
  VALUES ('${pid}', 'Test Product', 'TestBrand', 'TestCategory', 100, 5, 1, 18, '[]', 'test-uid', ${now})`);
check("product create", (await db.execute(`SELECT 1 FROM products WHERE id = '${pid}'`)).rows.length === 1);

// READ (list / get)
check("product list/get", (await db.execute(`SELECT * FROM products WHERE id = '${pid}'`)).rows[0].name === "Test Product");

// UPDATE
await db.execute(`UPDATE products SET name = 'Updated Product', quantity = 3, updated_at = ${now} WHERE id = '${pid}'`);
const up = (await db.execute(`SELECT name, quantity FROM products WHERE id = '${pid}'`)).rows[0];
check("product update", up.name === "Updated Product" && up.quantity === 3, `name=${up.name} qty=${up.quantity}`);

/* ---------------- ORDER (uses the product as a line item) ---------------- */
const oid = randomUUID();
await db.execute(`INSERT INTO orders (id, order_no, status, customer_name, phone, address, payment_method, total_items, total, buyer_id, created_at)
  VALUES ('${oid}', 'TEST-0001', 'Placed', 'Test Buyer', '9999999999', 'Test Address', 'COD', 1, 100, 'buyer-uid', ${now})`);
await db.execute(`INSERT INTO order_items (order_id, product_id, name, price, quantity, line_total, gst_rate)
  VALUES ('${oid}', '${pid}', 'Updated Product', 100, 1, 100, 18)`);

// Simulate ordering consuming stock (as placeOrder does)
await db.execute(`UPDATE products SET quantity = quantity - 1, updated_at = ${now} WHERE id = '${pid}'`);
const afterOrder = (await db.execute(`SELECT quantity FROM products WHERE id = '${pid}'`)).rows[0];
check("order create + stock decrement", afterOrder.quantity === 2, `qty=${afterOrder.quantity}`);

// CANCEL restocks stock (as changeStatus does)
await db.execute(`UPDATE orders SET status = 'Cancelled', updated_at = ${now} WHERE id = '${oid}' AND status = 'Placed'`);
await db.execute(`UPDATE products SET quantity = COALESCE(quantity, 0) + 1, updated_at = ${now} WHERE id = '${pid}'`);
const afterCancel = (await db.execute(`SELECT quantity FROM products WHERE id = '${pid}'`)).rows[0];
check("order cancel + restock", afterCancel.quantity === 3, `qty=${afterCancel.quantity}`);

/* ---------------- SELLERS (staff add/remove) ---------------- */
const suid = "test-staff-uid";
await db.execute(`INSERT INTO sellers (uid, added_by, created_at) VALUES ('${suid}', 'owner-uid', ${now}) ON CONFLICT(uid) DO NOTHING`);
check("staff add", (await db.execute(`SELECT 1 FROM sellers WHERE uid = '${suid}'`)).rows.length === 1);
await db.execute(`DELETE FROM sellers WHERE uid = '${suid}'`);
check("staff remove (delete)", (await db.execute(`SELECT 1 FROM sellers WHERE uid = '${suid}'`)).rows.length === 0);

/* ---------------- FOREIGN KEY CASCADE (order_items when order deleted) ---------------- */
await db.execute(`DELETE FROM orders WHERE id = '${oid}'`);
const linesLeft = (await db.execute(`SELECT COUNT(*) AS n FROM order_items WHERE order_id = '${oid}'`)).rows[0].n;
check("order delete cascades order_items", linesLeft === 0, `leftover lines=${linesLeft}`);

/* ---------------- PRODUCT DELETE (the main delete operation) ---------------- */
await db.execute(`DELETE FROM products WHERE id = '${pid}'`);
check("product delete", (await db.execute(`SELECT 1 FROM products WHERE id = '${pid}'`)).rows.length === 0);

// Deleting a non-existent product must report 0 changes (API maps this to 404)
const none = (await db.execute({ sql: "DELETE FROM products WHERE id = ?", args: [randomUUID()] })).rowsAffected;
check("delete non-existent returns 0 changes", none === 0);

console.log(`\n${pass} passed, ${fail} failed. DB: ${url}`);
process.exit(fail === 0 ? 0 : 1);
