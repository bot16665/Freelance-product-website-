// Copies your OLD Firebase Realtime Database data (products + orders) into the SQL database.
//
// 1. Firebase console -> Realtime Database -> Data -> (three dots menu) -> "Export JSON"
// 2. Run:  npm run import:firebase -- path/to/your-export.json
//
// Safe to run more than once: existing rows are replaced, nothing is duplicated.
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
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

const dbFile = path.resolve(process.env.DATABASE_FILE ?? "./data/store.db");
fs.mkdirSync(path.dirname(dbFile), { recursive: true });
const db = new Database(dbFile);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(SCHEMA);

const data = JSON.parse(fs.readFileSync(file, "utf8"));
const items = data.items ?? {};
const orders = data.orders ?? {};

const text = (v) => (typeof v === "string" && v.trim() ? v.trim() : null);
const numOrNull = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));
const category = (c) => (!c || c === "Printers" ? "General" : String(c)); // the store is no longer printer-only

const putProduct = db.prepare(`
  INSERT OR REPLACE INTO products (id, name, brand, manufacturer, category, purchase_date, warranty_expiry, status, notes,
    selling_price, quantity, published, country_of_origin, gst_rate, warranty, packer_details, main_image, image_urls,
    created_by, created_at, updated_at)
  VALUES (@id, @name, @brand, @manufacturer, @category, @purchase_date, @warranty_expiry, @status, @notes,
    @selling_price, @quantity, @published, @country_of_origin, @gst_rate, @warranty, @packer_details, @main_image, @image_urls,
    @created_by, @created_at, @updated_at)`);

const putOrder = db.prepare(`
  INSERT OR REPLACE INTO orders (id, order_no, invoice_no, status, company_name, gstin, email, customer_name, phone, address,
    notes, payment_method, total_items, total, buyer_id, buyer_email, created_at, updated_at)
  VALUES (@id, @order_no, @invoice_no, @status, @company_name, @gstin, @email, @customer_name, @phone, @address,
    @notes, @payment_method, @total_items, @total, @buyer_id, @buyer_email, @created_at, @updated_at)`);
const delLines = db.prepare("DELETE FROM order_items WHERE order_id = ?");
const putLine = db.prepare(`
  INSERT INTO order_items (order_id, product_id, name, brand, image, price, quantity, line_total, gst_rate)
  VALUES (@order_id, @product_id, @name, @brand, @image, @price, @quantity, @line_total, @gst_rate)`);

let p = 0, o = 0, skipped = 0;

db.transaction(() => {
  for (const [id, v] of Object.entries(items)) {
    if (!v || typeof v !== "object" || !text(v.itemName)) { skipped++; continue; }
    const urls = Array.isArray(v.imageUrls) ? v.imageUrls.filter((u) => typeof u === "string") : [];
    putProduct.run({
      id,
      name: text(v.itemName),
      brand: text(v.companyName),
      manufacturer: text(v.manufacturer),
      category: category(v.category),
      purchase_date: text(v.purchaseDate),
      warranty_expiry: text(v.warrantyExpiry),
      status: text(v.status),
      notes: text(v.notes),
      selling_price: numOrNull(v.sellingPrice),
      quantity: numOrNull(v.quantity),
      published: v.published === false ? 0 : 1,
      country_of_origin: text(v.countryOfOrigin),
      gst_rate: numOrNull(v.gstRate),
      warranty: text(v.warranty),
      packer_details: text(v.packerDetails),
      main_image: text(v.mainImage) ?? urls[0] ?? null,
      image_urls: JSON.stringify(urls),
      created_by: text(v.createdBy),
      created_at: numOrNull(v.createdAt) ?? Date.now(),
      updated_at: numOrNull(v.updatedAt),
    });
    p++;
  }

  for (const [id, v] of Object.entries(orders)) {
    const buyer = text(v?.buyerId) ?? text(v?.createdBy); // old orders used "createdBy"
    if (!v || !buyer || !text(v.orderNo)) { skipped++; continue; }
    const lines = Array.isArray(v.items) ? v.items : Object.values(v.items ?? {});
    const total = lines.reduce((s, l) => s + Number(l.price ?? 0) * Number(l.quantity ?? 0), 0);
    putOrder.run({
      id,
      order_no: text(v.orderNo),
      invoice_no: text(v.invoiceNo),
      status: ["Placed", "Confirmed", "Delivered", "Cancelled"].includes(v.status) ? v.status : "Placed",
      company_name: text(v.companyName),
      gstin: text(v.gstin),
      email: text(v.email),
      customer_name: text(v.customerName) ?? "Customer",
      phone: text(v.phone) ?? "",
      address: text(v.address) ?? "",
      notes: text(v.notes),
      payment_method: text(v.paymentMethod) ?? "Cash on Delivery",
      total_items: lines.reduce((s, l) => s + Number(l.quantity ?? 0), 0),
      total: Math.round(total * 100) / 100,
      buyer_id: buyer,
      buyer_email: text(v.buyerEmail),
      created_at: numOrNull(v.createdAt) ?? Date.now(),
      updated_at: numOrNull(v.updatedAt),
    });
    delLines.run(id);
    for (const l of lines) {
      putLine.run({
        order_id: id,
        product_id: String(l.itemId ?? ""),
        name: text(l.name) ?? "Product",
        brand: text(l.brand),
        image: text(l.image),
        price: Number(l.price ?? 0),
        quantity: Number(l.quantity ?? 0),
        line_total: Number(l.price ?? 0) * Number(l.quantity ?? 0),
        gst_rate: numOrNull(l.gstRate) ?? 18,
      });
    }
    o++;
  }
})();

console.log(`Imported ${p} product(s) and ${o} order(s) into ${dbFile}` + (skipped ? ` (${skipped} skipped: incomplete records)` : ""));
