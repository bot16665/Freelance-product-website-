"use client";

import { useState } from "react";
import { useSession } from "@/hooks/useSession";
import { useCatalog } from "@/hooks/useCatalog";
import { useOrders } from "@/hooks/useOrders";
import { AppHeader } from "@/components/layout/AppHeader";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { PlaceOrder } from "./PlaceOrder";
import { OrderHistory } from "./OrderHistory";
import { InvoiceModal } from "./InvoiceModal";
import type { Order } from "@/lib/types";

type Tab = "place" | "history";

export function OrdersView() {
  const { user, role, checking } = useSession();
  const { items, loading: itemsLoading, error: itemsError, refresh: refreshCatalog } = useCatalog(user);
  const { orders, loading: ordersLoading, error: ordersError, refresh: refreshOrders } = useOrders(user);

  const [tab, setTab] = useState<Tab>("place");
  const [toast, setToast] = useState<ToastState>(null);
  const [newOrder, setNewOrder] = useState<Order | null>(null);

  if (checking || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Checking your session...
      </main>
    );
  }

  const error = itemsError || ordersError;
  const placedCount = orders.filter((o) => o.status === "Placed" || o.status === "Confirmed").length;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <AppHeader user={user} role={role} active="shop" />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold sm:text-3xl">Shop</h1>
          <p className="mt-2 text-sm text-slate-500">Pick what you need, place your order and get your invoice. The store confirms it and delivers.</p>
        </div>

        <div className="mb-6 flex gap-2 border-b border-slate-200">
          {(
            [
              ["place", "Shop"],
              ["history", `My Orders (${orders.length})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium ${
                tab === key ? "border-blue-600 text-blue-700" : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              {label}
              {key === "history" && placedCount > 0 && (
                <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">{placedCount} active</span>
              )}
            </button>
          ))}
        </div>

        {error && (
          <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}

        {itemsLoading || ordersLoading ? (
          <p className="py-16 text-center text-sm text-slate-500">Loading...</p>
        ) : tab === "place" ? (
          <PlaceOrder
            user={user}
            items={items}
            onPlaced={(order) => {
              setToast({ type: "success", message: `${order.orderNo} placed. The store will confirm it shortly.` });
              setTab("history");
              setNewOrder(order); // open the invoice right away
              refreshOrders();
              refreshCatalog(); // stock just went down
            }}
            onError={(message) => setToast({ type: "error", message })}
          />
        ) : (
          <OrderHistory
            orders={orders}
            mode="buyer"
            onChanged={refreshOrders}
            onError={(message) => setToast({ type: "error", message })}
            onSuccess={(message) => setToast({ type: "success", message })}
          />
        )}
      </div>

      {newOrder && <InvoiceModal order={newOrder} onClose={() => setNewOrder(null)} />}
    </main>
  );
}
