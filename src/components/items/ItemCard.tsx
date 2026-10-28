"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { describeError, isSellable, money, stockStatus } from "@/lib/utils";
import type { InventoryItem } from "@/lib/types";
import { LoaderCircle, Package, Pencil, Trash2 } from "lucide-react";

export function ItemCard({ item, onDeleted }: { item: InventoryItem; onDeleted?: () => void }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const stock = stockStatus(item.quantity);
  const live = isSellable(item);

  async function handleDelete() {
    setDeleting(true);
    setError("");
    try {
      await apiFetch(`/api/items/${item.id}`, { method: "DELETE" });
      setConfirmOpen(false);
      onDeleted?.();
    } catch (err) {
      setError(describeError(err, "Could not delete the product. Please try again."));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => router.push(`/dashboard/items/${item.id}`)}
        className="text-left"
      >
        <div className="relative flex aspect-[4/3] items-center justify-center bg-slate-100">
          {item.mainImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={item.mainImage} alt={item.itemName || "Item"} className="h-full w-full object-cover" />
          ) : (
            <Package size={36} className="text-slate-400" />
          )}
        </div>

        <div className="p-4">
          <h3 className="line-clamp-2 font-semibold">{item.itemName || "Unnamed item"}</h3>
          <p className="mt-1 text-sm text-slate-500">{item.companyName || "No brand"}</p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {item.sellingPrice != null ? (
              <span className="text-lg font-bold">{money(item.sellingPrice)}</span>
            ) : (
              <span className="text-sm text-amber-600">No price set</span>
            )}
            {stock && <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${stock.style}`}>{stock.text}</span>}
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                live ? "bg-blue-50 text-blue-700" : "bg-slate-100 text-slate-500"
              }`}
            >
              {live ? "Live in store" : "Hidden from store"}
            </span>
          </div>

        </div>
      </button>

      <div className="mt-auto flex gap-2 border-t border-slate-100 p-3">
        <button
          type="button"
          onClick={() => router.push(`/dashboard/items/${item.id}/edit`)}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Pencil size={16} /> Edit
        </button>
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          <Trash2 size={16} /> Delete
        </button>
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Delete this item?</h2>
            <p className="mt-2 text-sm text-slate-500">
              {item.itemName || "This item"} will be permanently removed. This cannot be undone.
            </p>

            {error && (
              <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
                className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium hover:bg-slate-100 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {deleting ? <LoaderCircle size={17} className="animate-spin" /> : <Trash2 size={17} />}
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
