# Store setup (read this once)

The app now has **two kinds of users**.

| | Customer (default) | Store staff ("seller") |
|---|---|---|
| Sign up | Anyone, with Google | Same login, but the owner gives them access |
| Can do | Browse the store, order, see/cancel own orders, view invoice | Add/edit/delete items, set price & stock, confirm/reject/deliver orders |
| Lands on | `/orders` (Shop) | `/dashboard` (Items) |

## 1. Make yourself (and your staff) a seller
Nobody can make themselves a seller from the app. It is done in the Firebase console:

1. Sign in to the app once with the Google account.
2. A "Store staff only" screen shows your **user ID**. Copy it (or find it in Firebase → Authentication → Users → User UID).
3. Firebase console → Realtime Database → Data → add this at the root:
   `sellers` → `<that user ID>` → value `true`
4. Refresh the app. You now see Items and Customer orders.

Repeat for each staff member. Remove the entry to remove access.

## 2. Publish the new rules (required)
Realtime Database → Rules → paste `database.rules.json` → Publish.
(The old rules file `firebase_ruls` was removed. It is incompatible with the store.)

## 3. Existing items
Items added before this update are not in the store yet. On the Items page click **Sync all to store**
(items need a price and stock to be sold). New items are published automatically
(tick/untick "Show this item in the store" in the form).

Old orders were saved with the previous format and will not appear in the new order screens.

## 4. Edit your invoice details
`src/lib/company.ts` (company name, address, GSTIN, bank, terms).

## How an order flows
1. Customer adds items, enters company details, places order -> status **Placed** (proforma invoice).
2. Staff open **Customer orders** -> **Confirm** (stock is reduced, becomes a **Tax invoice**) or **Reject**.
3. Staff mark **Delivered**. A customer can cancel their own order only while it is Placed.

## Known limits (without a backend)
* Stock is reduced when staff confirm, not when the customer orders. Two customers can order the last unit;
  the second confirmation fails with "Not enough stock" and staff reject it.
* Image uploads are limited to 2 MB images in the user's own folder, but Storage rules cannot check the
  seller list. For strict control use Firebase custom claims / a Cloud Function.
* For payments, automatic email and fully tamper-proof totals, move order placing to a Cloud Function.
