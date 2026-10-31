import { randomUUID } from "node:crypto";
import { getDb } from "./db";
import { badRequest, num, text, type Row } from "./http";
import type { InventoryItem } from "@/lib/types";
import type { InValue, ResultSet } from "@libsql/client";

function parseUrls(v: unknown): string[] {
  try {
    const arr = JSON.parse(String(v ?? "[]"));
    return Array.isArray(arr) ? arr.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

/** Everything staff can see about a product. */
export function toItem(r: Row): InventoryItem {
  return {
    id: r.id,
    itemName: r.name,
    companyName: r.brand ?? "",
    manufacturer: r.manufacturer ?? "",
    category: r.category ?? "",
    purchaseDate: r.purchase_date ?? "",
    warrantyExpiry: r.warranty_expiry ?? "",
    status: r.status ?? "",
    notes: r.notes ?? "",
    sellingPrice: r.selling_price ?? null,
    quantity: r.quantity ?? null,
    published: r.published === 1,
    countryOfOrigin: r.country_of_origin ?? "",
    gstRate: r.gst_rate ?? null,
    warranty: r.warranty ?? "",
    packerDetails: r.packer_details ?? "",
    imageUrls: parseUrls(r.image_urls),
    mainImage: r.main_image ?? null,
    createdBy: r.created_by ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at ?? undefined,
  };
}

/** Only what a customer needs (no purchase date, notes, supplier info...). */
export function toCatalogItem(r: Row): InventoryItem {
  return {
    id: r.id,
    itemName: r.name,
    companyName: r.brand ?? "",
    category: r.category ?? "",
    sellingPrice: r.selling_price,
    quantity: r.quantity,
    gstRate: r.gst_rate ?? null,
    countryOfOrigin: r.country_of_origin ?? "",
    warranty: r.warranty ?? "",
    imageUrls: parseUrls(r.image_urls),
    mainImage: r.main_image ?? null,
    updatedAt: r.updated_at ?? undefined,
  };
}

export async function listAll() {
  const db = await getDb();
  const res = await db.execute("SELECT * FROM products ORDER BY created_at DESC");
  return res.rows.map((r) => toItem(r as Row));
}

export async function listCatalog() {
  const db = await getDb();
  const res = await db.execute(
    `SELECT * FROM products
     WHERE published = 1 AND selling_price > 0 AND quantity IS NOT NULL
     ORDER BY name COLLATE NOCASE`
  );
  return res.rows.map((r) => toCatalogItem(r as Row));
}

export async function getItem(id: string) {
  const db = await getDb();
  const res = await db.execute({ sql: "SELECT * FROM products WHERE id = ?", args: [id] });
  return res.rows.length ? toItem(res.rows[0] as Row) : null;
}

/* ------------------------------ validation ------------------------------ */

function parseImages(v: unknown): string[] {
  if (v === undefined || v === null) return [];
  if (!Array.isArray(v) || v.length > 9) throw badRequest("You can add up to 9 images.");
  return v.map((u) => {
    if (typeof u !== "string" || u.length > 500) throw badRequest("Invalid image link.");
    // only Vercel Blob / https links, or legacy "/api/files/..." urls from the old data
    if (!u.startsWith("/api/files/") && !u.startsWith("https://")) throw badRequest("Invalid image link.");
    return u;
  });
}

export function parseProduct(body: Record<string, unknown>) {
  const published = body.published !== false;
  const sellingPrice = num(body.sellingPrice, "Selling price", { min: 0.01, max: 100_000_000 });
  const quantity = num(body.quantity, "Stock quantity", { min: 0, max: 10_000_000, int: true });
  if (published && sellingPrice === null) throw badRequest("A price is required for products shown in the store.");
  if (published && quantity === null) throw badRequest("Stock is required for products shown in the store.");

  const images = parseImages(body.imageUrls);
  return {
    name: text(body.itemName, 150, "Product name", true) as string,
    brand: text(body.companyName, 100, "Brand"),
    manufacturer: text(body.manufacturer, 150, "Manufacturer"),
    category: text(body.category, 50, "Category"),
    purchaseDate: text(body.purchaseDate, 20, "Purchase date"),
    warrantyExpiry: text(body.warrantyExpiry, 20, "Warranty expiry"),
    status: text(body.status, 20, "Status"),
    notes: text(body.notes, 1000, "Notes"),
    sellingPrice,
    quantity,
    published,
    countryOfOrigin: text(body.countryOfOrigin, 60, "Country of origin"),
    gstRate: num(body.gstRate, "GST rate", { min: 0, max: 100 }),
    warranty: text(body.warranty, 100, "Warranty"),
    packerDetails: text(body.packerDetails, 500, "Packer details"),
    imageUrls: images,
    mainImage: images[0] ?? null,
  };
}

type Parsed = ReturnType<typeof parseProduct>;

const INSERT_SQL = `
  INSERT INTO products (id, name, brand, manufacturer, category, purchase_date, warranty_expiry, status, notes,
     selling_price, quantity, published, country_of_origin, gst_rate, warranty, packer_details,
     main_image, image_urls, created_by, created_at, updated_at)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

const insertArgs = (id: string, p: Parsed, uid: string, now: number): InValue[] => [
  id, p.name, p.brand, p.manufacturer, p.category, p.purchaseDate, p.warrantyExpiry, p.status, p.notes,
  p.sellingPrice, p.quantity, p.published ? 1 : 0, p.countryOfOrigin, p.gstRate, p.warranty, p.packerDetails,
  p.mainImage, JSON.stringify(p.imageUrls), uid, now, now,
];

export async function createItem(p: Parsed, uid: string) {
  const id = randomUUID();
  const now = Date.now();
  const db = await getDb();
  await db.execute({ sql: INSERT_SQL, args: insertArgs(id, p, uid, now) });
  return getItem(id) as Promise<InventoryItem>;
}

export async function updateItem(id: string, p: Parsed) {
  const db = await getDb();
  const res: ResultSet = await db
    .execute({
      sql: `UPDATE products SET name = ?, brand = ?, manufacturer = ?, category = ?, purchase_date = ?, warranty_expiry = ?,
         status = ?, notes = ?, selling_price = ?, quantity = ?, published = ?, country_of_origin = ?, gst_rate = ?,
         warranty = ?, packer_details = ?, main_image = ?, image_urls = ?, updated_at = ?
       WHERE id = ?`,
      args: [
        p.name, p.brand, p.manufacturer, p.category, p.purchaseDate, p.warrantyExpiry, p.status, p.notes,
        p.sellingPrice, p.quantity, p.published ? 1 : 0, p.countryOfOrigin, p.gstRate, p.warranty, p.packerDetails,
        p.mainImage, JSON.stringify(p.imageUrls), Date.now(), id,
      ],
    });
  return res.rowsAffected === 1 ? getItem(id) : null;
}

export async function deleteItem(id: string) {
  const db = await getDb();
  const res = await db.execute({ sql: "DELETE FROM products WHERE id = ?", args: [id] });
  return res.rowsAffected === 1;
}
