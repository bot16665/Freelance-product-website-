"use client";

import { useState } from "react";
import { Download, LoaderCircle } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { useOrders } from "@/hooks/useOrders";
import { AppHeader } from "@/components/layout/AppHeader";
import { Toast, type ToastState } from "@/components/ui/Toast";
import { downloadOrdersExcel } from "@/lib/orders";
import { OrderHistory } from "./OrderHistory";

/** Store staff: every customer order, with confirm / reject / deliver actions. */
export function StaffOrders() {
  const { user, role, checking } = useSession();
  const { orders, loading, error, refresh } = useOrders(user, "all");
  const [toast, setToast] = useState<ToastState>(null);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      await downloadOrdersExcel(from || undefined, to || undefined);
      setToast({ type: "success", message: "Excel file downloaded." });
    } catch (err) {
      setToast({ type: "error", message: err instanceof Error ? err.message : "Could not download the Excel file." });
    } finally {
      setExporting(false);
    }
  }

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
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Customer orders</h1>
            <p className="mt-2 text-sm text-slate-500">
              {waiting > 0
                ? `${waiting} new order${waiting === 1 ? "" : "s"} waiting for you to confirm.`
                : "Confirm an order to turn its proforma invoice into a tax invoice. Stock is reserved when the customer orders."}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              aria-label="From date"
              value={from}
              max={to || undefined}
              onChange={(e) => setFrom(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <span className="text-sm text-slate-400">to</span>
            <input
              type="date"
              aria-label="To date"
              value={to}
              min={from || undefined}
              onChange={(e) => setTo(e.target.value)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {exporting ? <LoaderCircle size={18} className="animate-spin" /> : <Download size={18} />}
              {exporting ? "Making Excel..." : "Download Excel"}
            </button>
          </div>
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
