// Sanity checks for every DB write/read/delete operation, run directly against the real DB.
// Usage: node scripts/test-db-ops.mjs
import Database from "better-sqlite3";

import path from "node:path";
import { randomUUID } from "node:crypto";

const dbFile = process.env.DATABASE_FILE ?? "./data/store.db";
const db = new Database(dbFile);
db.pragma("foreign_keys = ON");

let pass = 0, fail = 0;
const check = (name, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? "  -> " + extra : ""}`);
  if (ok) pass++; else fail++;
};

const now = Date.now();

/* ---------------- PRODUCTS ---------------- */
// CREATE
const pid = randomUUID();
db.prepare(`INSERT INTO products (id, name, brand, category, selling_price, quantity, published, gst_rate, image_urls, created_by, created_at)
  VALUES (?, 'Test Product', 'TestBrand', 'TestCategory', 100, 5, 1, 18, '[]', 'test-uid', ?)`).run(pid, now);
check("product create", db.prepare("SELECT 1 FROM products WHERE id = ?").get(pid) !== undefined);

// READ (list / get)
check("product list/get", db.prepare("SELECT * FROM products WHERE id = ?").get(pid).name === "Test Product");

// UPDATE
db.prepare("UPDATE products SET name = ?, quantity = ?, updated_at = ? WHERE id = ?").run("Updated Product", 3, now, pid);
const up = db.prepare("SELECT name, quantity FROM products WHERE id = ?").get(pid);
check("product update", up.name === "Updated Product" && up.quantity === 3, `name=${up.name} qty=${up.quantity}`);

/* ---------------- ORDER (uses the product as a line item) ---------------- */
const oid = randomUUID();
db.prepare(`INSERT INTO orders (id, order_no, status, customer_name, phone, address, payment_method, total_items, total, buyer_id, created_at)
  VALUES (?, 'TEST-0001', 'Placed', 'Test Buyer', '9999999999', 'Test Address', 'COD', 1, 100, 'buyer-uid', ?)`).run(oid, now);
db.prepare(`INSERT INTO order_items (order_id, product_id, name, price, quantity, line_total, gst_rate)
  VALUES (?, ?, 'Updated Product', 100, 1, 100, 18)`).run(oid, pid);

// Simulate ordering consuming stock (as placeOrder does)
db.prepare("UPDATE products SET quantity = quantity - 1, updated_at = ? WHERE id = ?").run(now, pid);
const afterOrder = db.prepare("SELECT quantity FROM products WHERE id = ?").get(pid);
check("order create + stock decrement", afterOrder.quantity === 2, `qty=${afterOrder.quantity}`);

// CANCEL restocks stock (as changeStatus does)
db.prepare("UPDATE orders SET status = 'Cancelled', updated_at = ? WHERE id = ? AND status = 'Placed'").run(now, oid);
db.prepare("UPDATE products SET quantity = COALESCE(quantity, 0) + ?, updated_at = ? WHERE id = ?").run(1, now, pid);
const afterCancel = db.prepare("SELECT quantity FROM products WHERE id = ?").get(pid);
check("order cancel + restock", afterCancel.quantity === 3, `qty=${afterCancel.quantity}`);

/* ---------------- SELLERS (staff add/remove) ---------------- */
const suid = "test-staff-uid";
db.prepare("INSERT OR IGNORE INTO sellers (uid, added_by, created_at) VALUES (?, ?, ?)").run(suid, "owner-uid", now);
check("staff add", db.prepare("SELECT 1 FROM sellers WHERE uid = ?").get(suid) !== undefined);
db.prepare("DELETE FROM sellers WHERE uid = ?").run(suid);
check("staff remove (delete)", db.prepare("SELECT 1 FROM sellers WHERE uid = ?").get(suid) === undefined);

/* ---------------- FOREIGN KEY CASCADE (order_items when order deleted) ---------------- */
db.prepare("DELETE FROM orders WHERE id = ?").run(oid);
const linesLeft = db.prepare("SELECT COUNT(*) AS n FROM order_items WHERE order_id = ?").get(oid).n;
check("order delete cascades order_items", linesLeft === 0, `leftover lines=${linesLeft}`);

/* ---------------- PRODUCT DELETE (the main delete operation) ---------------- */
db.prepare("DELETE FROM products WHERE id = ?").run(pid);
check("product delete", db.prepare("SELECT 1 FROM products WHERE id = ?").get(pid) === undefined);

// Deleting a non-existent product must report 0 changes (API maps this to 404)
const none = db.prepare("DELETE FROM products WHERE id = ?").run(randomUUID()).changes;
check("delete non-existent returns 0 changes", none === 0);

console.log(`\n${pass} passed, ${fail} failed. DB: ${path.resolve(dbFile)}`);
db.close();
process.exit(fail === 0 ? 0 : 1);
