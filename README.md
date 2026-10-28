# Online Store (Next.js + your own SQL database)

* **Firebase is used ONLY for login** (Google sign-in). It stores no data, so there are no database or storage bills.
* **All data lives in your own SQL database** (SQLite, one file: `data/store.db`).
* **Product images are saved on your own disk** (`data/uploads`).
* Two kinds of users: **Customers** (browse, order, see invoices) and **Store staff** (manage products and orders).

## 1. First run

```bash
npm install
cp .env.example .env.local      # then open .env.local
```

In `.env.local` set `OWNER_EMAILS` to your Google email (the account you sign in with). Then:

```bash
npm run dev                      # open http://localhost:3000
```

Sign in with that Google account. Because your email is in `OWNER_EMAILS`, you land on the **Products** dashboard as store staff.
Everyone else who signs in is a **customer** and lands on the shop.

Also edit `src/lib/company.ts` (company name, address, GSTIN, bank, terms). It is printed on every invoice.

## 2. Giving staff access
Staff menu → **Staff** page. Everyone who has signed in once is listed. Click **Make staff**. No IDs, no console.
(Owners listed in `OWNER_EMAILS` always have access and can't be removed from the page.)

## 3. Move your old Firebase data into SQL
1. Firebase console → Realtime Database → Data → three dots → **Export JSON**.
2. `npm run import:firebase -- path/to/export.json`

Products and orders are copied (old "Printers" category becomes "General"). Safe to run more than once.

## 4. Backup
Copy the whole `data/` folder (database + images). That is everything.

## How it works
```
Browser ──(Firebase login token)──> /api routes ──> SQLite (data/store.db)
```
* Every API call carries the Firebase login token. The server checks it with Google's public keys (no secret key needed), then decides if the person is staff or a customer. A customer can never become staff from the browser.
* **Prices and stock are decided by the server.** The browser only sends product ids and quantities, so nobody can change a price.
* **Stock is reserved when a customer places an order** (atomically, so the last unit can never be sold twice) and returned if the order is cancelled or rejected.
* Order flow: `Placed` (proforma invoice) → staff `Confirm` (tax invoice) → `Delivered`. Customers can cancel only while `Placed`.
* Customers only receive public fields (no purchase date, notes, supplier info).

## Problems this design solves
| Problem | Solution |
|---|---|
| Firebase bills for data/storage | Own SQL database + own disk. Firebase only logs people in. |
| Anyone could add products | Role checked on the server for every request. |
| Customer changes price in the browser | Server recomputes every price from the database. |
| Two customers buy the last unit | Atomic stock update inside a transaction. |
| Cancelling twice restocks twice | Status change is conditional, so it can only happen once. |
| Customer sees internal data | Separate public catalog endpoint with only safe fields. |
| Upload of fake/dangerous files | File type checked from the file's real bytes, 2 MB limit, random file names. |
| Deleting a product breaks old orders | Orders store their own copy of name/price/GST. |

## Deploying
SQLite is a file, so you need a server with a **persistent disk** (your own PC, a VPS, Railway/Render with a disk).
It will **not** work on serverless hosts like Vercel. Steps: `npm run build` then `npm start`, keep `.env.local` and the `data/` folder.
Add your site's domain in Firebase console → Authentication → Settings → **Authorized domains** (needed for Google login).

## Switching to MySQL/PostgreSQL later
All database code is in `src/server/` (`db.ts`, `products.ts`, `orders.ts`, `schema.mjs`, and `app/api/staff`).
The SQL is standard, so moving to MySQL/PostgreSQL only means changing those files.

## Known limits
* Lists refresh every 15 seconds (and when you return to the tab) instead of instantly.
* Payment is Cash on Delivery only. There is no email sending yet.
* A customer could place many orders to hold stock; staff can reject them.
* No rate limiting yet. Put the app behind a reverse proxy (Nginx/Cloudflare) when public.
