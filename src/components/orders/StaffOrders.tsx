"use client";

import { useState } from "react";
import { useSession } from "@/hooks/useSession";
import { useOrders } from "@/hooks/useOrders";
import { AppHeader } from "@/components/layout/AppHeader";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { OrderHistory } from "./OrderHistory";

/** Store staff: every customer order, with confirm / reject / deliver actions. */
export function StaffOrders() {
  const { user, role, checking } = useSession();
  const { orders, loading, error, refresh } = useOrders(user, "all");
  const [toast, setToast] = useState<ToastState>(null);

  if (checking || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Checking your session...
      </main>
    );
  }

  const waiting = orders.filter((o) => o.status === "Placed").length;

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <AppHeader user={user} role={role} active="staffOrders" />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold sm:text-3xl">Customer orders</h1>
          <p className="mt-2 text-sm text-slate-500">
            {waiting > 0
              ? `${waiting} new order${waiting === 1 ? "" : "s"} waiting for you to confirm.`
              : "Confirm an order to turn its proforma invoice into a tax invoice. Stock is reserved when the customer orders."}
          </p>
        </div>

        {error && (
          <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}

        {loading ? (
          <p className="py-16 text-center text-sm text-slate-500">Loading orders...</p>
        ) : (
          <OrderHistory
            orders={orders}
            mode="seller"
            onChanged={refresh}
            onError={(message) => setToast({ type: "error", message })}
            onSuccess={(message) => setToast({ type: "success", message })}
          />
        )}
      </div>
    </main>
  );
}
