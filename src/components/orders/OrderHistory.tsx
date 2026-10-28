"use client";

import { useState } from "react";
import { FileText, LoaderCircle, Package } from "lucide-react";
import { cancelOrderAsStaff, cancelOwnOrder, confirmOrder, markDelivered } from "@/lib/orders";
import { describeError, formatDate, money } from "@/lib/utils";
import { invoiceNumber, orderTotal } from "@/lib/invoice";
import { InvoiceModal } from "./InvoiceModal";
import type { Order, OrderStatus } from "@/lib/types";

const statusStyle: Record<OrderStatus, string> = {
  Placed: "bg-amber-50 text-amber-700",
  Confirmed: "bg-blue-50 text-blue-700",
  Delivered: "bg-emerald-50 text-emerald-700",
  Cancelled: "bg-red-50 text-red-700",
};

const FILTERS: Array<"All" | OrderStatus> = ["All", "Placed", "Confirmed", "Delivered", "Cancelled"];

type Action = "cancel" | "confirm" | "deliver";

export function OrderHistory({
  orders,
  mode,
  onChanged,
  onError,
  onSuccess,
}: {
  orders: Order[];
  /** "buyer" = a customer looking at their own orders, "seller" = store staff managing all orders */
  mode: "buyer" | "seller";
  /** called after an order was changed, so the list can reload */
  onChanged: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}) {
  const [filter, setFilter] = useState<"All" | OrderStatus>("All");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const invoiceOrder = orders.find((o) => o.id === invoiceId) ?? null;

  const visible = filter === "All" ? orders : orders.filter((o) => o.status === filter);

  /** Which buttons make sense for this order and this kind of user. */
  function actionsFor(order: Order): Action[] {
    if (mode === "buyer") return order.status === "Placed" ? ["cancel"] : [];
    if (order.status === "Placed") return ["cancel", "confirm"];
    if (order.status === "Confirmed") return ["cancel", "deliver"];
    return [];
  }

  async function run(order: Order, action: Action) {
    setBusyId(order.id);
    try {
      if (action === "cancel") {
        if (mode === "buyer") {
          await cancelOwnOrder(order);
          onSuccess(`${order.orderNo} cancelled.`);
        } else {
          await cancelOrderAsStaff(order);
          onSuccess(
            order.status === "Confirmed"
              ? `${order.orderNo} cancelled. Items were returned to stock.`
              : `${order.orderNo} rejected. Items were returned to stock.`
          );
        }
      } else if (action === "confirm") {
        await confirmOrder(order);
        onSuccess(`${order.orderNo} confirmed. Its invoice is now a Tax Invoice.`);
      } else {
        await markDelivered(order);
        onSuccess(`${order.orderNo} marked as delivered.`);
      }
      setConfirmId(null);
    } catch (err) {
      console.error("Order update failed:", err);
      onError(describeError(err, "Could not update the order."));
    } finally {
      setBusyId(null);
      onChanged();
    }
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              filter === f ? "bg-blue-600 text-white" : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
          <Package size={32} className="mx-auto mb-3 text-slate-400" />
          <p className="font-medium">{orders.length === 0 ? "No orders yet" : `No ${filter.toLowerCase()} orders`}</p>
          {orders.length === 0 && (
            <p className="mt-2 text-sm text-slate-500">
              {mode === "seller" ? "Customer orders will show up here." : "Orders you place will show up here."}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {visible.map((order) => (
            <article key={order.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{order.orderNo}</h3>
                  {order.companyName && <p className="mt-0.5 text-sm font-medium text-slate-700">{order.companyName}</p>}
                  <p className="mt-1 text-xs text-slate-500">
                    {formatDate(order.createdAt)} · {invoiceNumber(order)}
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyle[order.status] ?? "bg-slate-100 text-slate-700"}`}>
                  {order.status}
                </span>
              </div>

              <ul className="mt-4 divide-y divide-slate-100">
                {order.items.map((line) => (
                  <li key={line.itemId} className="flex items-center gap-3 py-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                      {line.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={line.image} alt={line.name} className="h-full w-full object-cover" />
                      ) : (
                        <Package size={18} className="text-slate-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{line.name}</p>
                      <p className="text-xs text-slate-500">
                        {line.quantity} × {money(line.price)}
                      </p>
                    </div>
                    <p className="text-sm font-semibold">{money(line.lineTotal)}</p>
                  </li>
                ))}
              </ul>

              <div className="mt-3 grid gap-3 border-t border-slate-100 pt-4 text-sm sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                    {mode === "seller" ? "Customer" : "Contact & delivery"}
                  </p>
                  <p className="mt-1 font-medium">{order.customerName}</p>
                  <p className="text-slate-600">{order.phone}</p>
                  <p className="whitespace-pre-line text-slate-600">{order.address}</p>
                  {order.gstin && <p className="text-xs text-slate-500">GSTIN: {order.gstin}</p>}
                  {order.notes?.trim() && <p className="mt-1 text-xs text-slate-500">Requirement: {order.notes}</p>}
                </div>
                <div className="sm:text-right">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{order.paymentMethod}</p>
                  <p className="mt-1 text-xs text-slate-500">{order.totalItems} items</p>
                  <p className="text-xl font-bold">{money(orderTotal(order))}</p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setInvoiceId(order.id)}
                  className="flex items-center gap-2 rounded-lg border border-blue-300 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
                >
                  <FileText size={16} /> View invoice
                </button>
              </div>

              {actionsFor(order).length > 0 && (
                <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
                  {confirmId === order.id ? (
                    <>
                      <span className="text-sm text-slate-600">
                        {mode === "seller"
                          ? order.status === "Confirmed"
                            ? "Cancel this order and return the items to stock?"
                            : "Reject this order? The items go back to stock."
                          : "Cancel this order?"}
                      </span>
                      <button
                        type="button"
                        onClick={() => setConfirmId(null)}
                        disabled={busyId === order.id}
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
                      >
                        Keep order
                      </button>
                      <button
                        type="button"
                        onClick={() => run(order, "cancel")}
                        disabled={busyId === order.id}
                        className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
                      >
                        {busyId === order.id && <LoaderCircle size={16} className="animate-spin" />}
                        Yes, cancel
                      </button>
                    </>
                  ) : (
                    <>
                      {actionsFor(order).includes("cancel") && (
                        <button
                          type="button"
                          onClick={() => setConfirmId(order.id)}
                          disabled={busyId === order.id}
                          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                        >
                          {mode === "seller" && order.status === "Placed" ? "Reject order" : "Cancel order"}
                        </button>
                      )}
                      {actionsFor(order).includes("confirm") && (
                        <button
                          type="button"
                          onClick={() => run(order, "confirm")}
                          disabled={busyId === order.id}
                          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                        >
                          {busyId === order.id && <LoaderCircle size={16} className="animate-spin" />}
                          Confirm order
                        </button>
                      )}
                      {actionsFor(order).includes("deliver") && (
                        <button
                          type="button"
                          onClick={() => run(order, "deliver")}
                          disabled={busyId === order.id}
                          className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {busyId === order.id && <LoaderCircle size={16} className="animate-spin" />}
                          Mark delivered
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      )}

      {invoiceOrder && <InvoiceModal order={invoiceOrder} onClose={() => setInvoiceId(null)} />}
    </section>
  );
}
