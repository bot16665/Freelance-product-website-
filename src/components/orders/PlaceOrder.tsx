"use client";

import { useEffect, useMemo, useState } from "react";
import type { User } from "firebase/auth";
import { LoaderCircle, Minus, Package, Plus, Search, ShoppingCart, Trash2 } from "lucide-react";
import { placeOrder } from "@/lib/orders";
import { describeError, money, stockStatus } from "@/lib/utils";
import { GSTIN_REGEX } from "@/lib/invoice";
import type { InventoryItem, Order } from "@/lib/types";

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

type Props = {
  user: User;
  items: InventoryItem[];
  onPlaced: (order: Order) => void;
  onError: (message: string) => void;
};

/* The cart and the customer's company details are remembered in this browser */
function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function canOrder(item: InventoryItem) {
  return (item.sellingPrice ?? 0) > 0 && (item.quantity ?? 0) > 0;
}

function orderBlockReason(item: InventoryItem) {
  if (!((item.sellingPrice ?? 0) > 0)) return "No price set";
  if (!((item.quantity ?? 0) > 0)) return "Out of stock";
  return "";
}

export function PlaceOrder({ user, items, onPlaced, onError }: Props) {
  const [search, setSearch] = useState("");
  const cartKey = `cart:${user.uid}`;
  const profileKey = `buyerProfile:${user.uid}`;
  const [cart, setCart] = useState<Record<string, number>>(() => readStored<Record<string, number>>(cartKey, {}));
  const [details, setDetails] = useState(() =>
    readStored(profileKey, {
      companyName: "",
      gstin: "",
      customerName: user.displayName ?? "",
      phone: "",
      email: user.email ?? "",
      address: "",
      notes: "",
    })
  );

  useEffect(() => {
    try {
      localStorage.setItem(cartKey, JSON.stringify(cart));
    } catch {}
  }, [cart, cartKey]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [placing, setPlacing] = useState(false);

  const visibleItems = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((i) =>
      [i.itemName, i.companyName, i.category].some((v) => v?.toLowerCase().includes(term))
    );
  }, [items, search]);

  // Cart lines that still exist and are still orderable
  const lines = useMemo(
    () =>
      items
        .filter((i) => cart[i.id] && canOrder(i))
        .map((item) => ({ item, quantity: Math.min(cart[item.id], item.quantity ?? 0) })),
    [items, cart]
  );

  const total = lines.reduce((sum, l) => sum + Number(l.item.sellingPrice) * l.quantity, 0);
  const totalItems = lines.reduce((sum, l) => sum + l.quantity, 0);

  function setQuantity(item: InventoryItem, quantity: number) {
    const max = item.quantity ?? 0;
    setCart((prev) => {
      const next = { ...prev };
      if (quantity <= 0) delete next[item.id];
      else next[item.id] = Math.min(quantity, max);
      return next;
    });
  }

  function validate() {
    const e: Record<string, string> = {};
    if (!details.companyName.trim()) e.companyName = "Company name is required.";
    if (details.gstin.trim() && !GSTIN_REGEX.test(details.gstin.trim().toUpperCase())) {
      e.gstin = "Enter a valid 15-character GSTIN, or leave it empty.";
    }
    if (!details.customerName.trim()) e.customerName = "Contact person is required.";
    if (details.email.trim() && !/^\S+@\S+\.\S+$/.test(details.email.trim())) e.email = "Enter a valid email address.";
    if (!/^[6-9]\d{9}$/.test(details.phone.trim())) e.phone = "Enter a valid 10-digit mobile number.";
    if (details.address.trim().length < 10) e.address = "Enter the full delivery address.";
    return e;
  }

  async function handlePlaceOrder() {
    if (lines.length === 0) {
      onError("Add at least one item to your order.");
      return;
    }
    const found = validate();
    setErrors(found);
    if (Object.keys(found).length > 0) return;

    setPlacing(true);
    try {
      const order = await placeOrder(lines, details);
      setCart({});
      setErrors({});
      // Remember who they are for next time (but not the notes, those are per order)
      try {
        localStorage.setItem(profileKey, JSON.stringify({ ...details, notes: "" }));
      } catch {}
      setDetails((prev) => ({ ...prev, notes: "" }));
      onPlaced(order);
    } catch (err) {
      console.error("Failed to place order:", err);
      onError(describeError(err, "Could not place the order. Please try again."));
    } finally {
      setPlacing(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Items */}
      <section>
        <div className="relative mb-4">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Search products by name, brand, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {items.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <Package size={32} className="mx-auto mb-3 text-slate-400" />
            <p className="font-medium">No items yet</p>
            <p className="mt-2 text-sm text-slate-500">Add items on the Items page first, then you can order them here.</p>
          </div>
        ) : visibleItems.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">No items match your search.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleItems.map((item) => {
              const stock = stockStatus(item.quantity);
              const orderable = canOrder(item);
              const inCart = cart[item.id] ?? 0;

              return (
                <div key={item.id} className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                  <div className="relative flex aspect-[4/3] items-center justify-center bg-slate-100">
                    {item.mainImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.mainImage} alt={item.itemName || "Item"} className="h-full w-full object-cover" />
                    ) : (
                      <Package size={32} className="text-slate-400" />
                    )}
                  </div>

                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="line-clamp-2 font-semibold">{item.itemName || "Unnamed item"}</h3>
                    <p className="mt-1 text-sm text-slate-500">{item.companyName || "No brand"}</p>

                    {(item.sellingPrice ?? 0) > 0 && (
                      <p className="mt-2 flex items-baseline gap-2">
                        <span className="text-lg font-bold">{money(Number(item.sellingPrice))}</span>
                      </p>
                    )}

                    {stock && (
                      <span className={`mt-2 w-fit rounded-full px-2.5 py-1 text-xs font-medium ${stock.style}`}>{stock.text}</span>
                    )}

                    <div className="mt-auto pt-4">
                      {!orderable ? (
                        <p className="rounded-lg bg-slate-100 px-3 py-2 text-center text-sm text-slate-500">
                          {orderBlockReason(item)}
                        </p>
                      ) : inCart === 0 ? (
                        <button
                          type="button"
                          onClick={() => setQuantity(item, 1)}
                          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                          <ShoppingCart size={16} /> Add to order
                        </button>
                      ) : (
                        <div className="flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 p-1">
                          <button
                            type="button"
                            aria-label="Decrease quantity"
                            onClick={() => setQuantity(item, inCart - 1)}
                            className="rounded-md p-2 text-blue-700 hover:bg-blue-100"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="text-sm font-semibold text-blue-800">{inCart}</span>
                          <button
                            type="button"
                            aria-label="Increase quantity"
                            onClick={() => setQuantity(item, inCart + 1)}
                            disabled={inCart >= (item.quantity ?? 0)}
                            className="rounded-md p-2 text-blue-700 hover:bg-blue-100 disabled:opacity-40"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Order summary */}
      <aside className="h-fit rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
        <h3 className="flex items-center gap-2 font-semibold">
          <ShoppingCart size={18} className="text-blue-600" />
          Your order {totalItems > 0 && <span className="text-sm font-normal text-slate-500">({totalItems} items)</span>}
        </h3>

        {lines.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Your order is empty. Add items from the list.</p>
        ) : (
          <ul className="mt-4 divide-y divide-slate-100">
            {lines.map(({ item, quantity }) => (
              <li key={item.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.itemName}</p>
                  <p className="text-xs text-slate-500">
                    {quantity} × {money(Number(item.sellingPrice))}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{money(Number(item.sellingPrice) * quantity)}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${item.itemName}`}
                    onClick={() => setQuantity(item, 0)}
                    className="rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-2 flex items-center justify-between border-t border-slate-200 pt-4">
          <span className="text-sm text-slate-500">Total</span>
          <span className="text-xl font-bold">{money(total)}</span>
        </div>

        <div className="mt-5 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Order placed with</p>

          <label className="block text-sm font-medium text-slate-700">
            Company name *
            <input
              maxLength={120}
              className={inputClass}
              placeholder="e.g. Sharma Office Solutions Pvt Ltd"
              value={details.companyName}
              onChange={(e) => setDetails({ ...details, companyName: e.target.value })}
            />
            {errors.companyName && <span className="mt-1 block text-xs font-normal text-red-600">{errors.companyName}</span>}
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Company GSTIN (optional)
            <input
              maxLength={15}
              className={`${inputClass} uppercase`}
              placeholder="15-character GSTIN"
              value={details.gstin}
              onChange={(e) => setDetails({ ...details, gstin: e.target.value.toUpperCase().replace(/\s/g, "") })}
            />
            {errors.gstin && <span className="mt-1 block text-xs font-normal text-red-600">{errors.gstin}</span>}
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Contact person *
            <input
              className={inputClass}
              value={details.customerName}
              onChange={(e) => setDetails({ ...details, customerName: e.target.value })}
            />
            {errors.customerName && <span className="mt-1 block text-xs font-normal text-red-600">{errors.customerName}</span>}
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Mobile number *
            <input
              inputMode="numeric"
              maxLength={10}
              className={inputClass}
              placeholder="10-digit number"
              value={details.phone}
              onChange={(e) => setDetails({ ...details, phone: e.target.value.replace(/\D/g, "") })}
            />
            {errors.phone && <span className="mt-1 block text-xs font-normal text-red-600">{errors.phone}</span>}
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Email (optional)
            <input
              type="email"
              maxLength={120}
              className={inputClass}
              value={details.email}
              onChange={(e) => setDetails({ ...details, email: e.target.value })}
            />
            {errors.email && <span className="mt-1 block text-xs font-normal text-red-600">{errors.email}</span>}
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Company / delivery address *
            <textarea
              rows={3}
              maxLength={300}
              className={inputClass}
              value={details.address}
              onChange={(e) => setDetails({ ...details, address: e.target.value })}
            />
            {errors.address && <span className="mt-1 block text-xs font-normal text-red-600">{errors.address}</span>}
          </label>

          <label className="block text-sm font-medium text-slate-700">
            What we need / notes (optional)
            <textarea
              rows={2}
              maxLength={500}
              className={inputClass}
              placeholder="e.g. Need delivery by Friday, include original cartridges"
              value={details.notes}
              onChange={(e) => setDetails({ ...details, notes: e.target.value })}
            />
          </label>

          <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">Payment: Cash on Delivery</p>
        </div>

        <button
          type="button"
          onClick={handlePlaceOrder}
          disabled={placing || lines.length === 0}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {placing && <LoaderCircle size={18} className="animate-spin" />}
          {placing ? "Placing order..." : "Place Order & Generate Invoice"}
        </button>
      </aside>
    </div>
  );
}
