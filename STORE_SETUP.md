# Store setup (read this once)

The app has **two kinds of users**.

| | Customer (default) | Store staff ("seller") |
|---|---|---|
| Sign up | Anyone, with Google | Same login, but the owner gives them access |
| Can do | Browse the store, order, see/cancel own orders, view invoice | Add/edit/delete items, set price & stock, confirm/reject/deliver orders |
| Lands on | `/orders` (Shop) | `/dashboard` (Items) |

## 1. Make yourself (and your staff) a seller

Nobody can make themselves a seller from the app. Access is controlled by the
`OWNER_EMAILS` environment variable plus the staff list inside the app:

1. Put your Google email in `.env` → `OWNER_EMAILS=you@example.com` (comma separated for several owners) and restart the server.
2. Sign in to the app with that account. You are now staff.
3. On the **Staff** page (`/dashboard/staff`) you can grant or remove staff access for anyone who has signed in.

Owners always have access and cannot be removed from the app (change `OWNER_EMAILS` instead).

## 2. Firebase

Firebase is used **only for signing in** (Google login). No Realtime Database,
Storage, or rules are needed — all data lives in the SQL database behind the `/api` routes.

## 3. Data and backups

* SQLite database: `data/store.db` (change with `DATABASE_FILE`).
* Uploaded images: `data/uploads` (change with `UPLOAD_DIR`).
* Backing up the `data/` folder backs up everything.

## 4. Edit your invoice details

`src/lib/company.ts` (company name, address, GSTIN, bank, terms).

## 5. Migrating old Firebase data

`npm run import:firebase -- path/to/firebase-export.json` copies products and
orders from an old Firebase Realtime Database export into the SQL database.

## How an order flows

1. Customer adds items, enters company details, places order -> status **Placed**
   (proforma invoice). Stock is reserved immediately.
2. Staff open **Customer orders** -> **Confirm** (becomes a **Tax invoice**) or **Cancel** (stock is returned).
3. Staff mark **Delivered**. A customer can cancel their own order only while it is Placed.

## Known limits

* Prices, GST and stock are all decided by the server — the browser cannot change them.
* Image uploads are limited to JPG/PNG/WebP under 2 MB, verified by file content on the server.
* For online payments or automatic emails, integrate a payment provider and mail service.
