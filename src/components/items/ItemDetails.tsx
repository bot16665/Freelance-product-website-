"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthUser } from "@/hooks/useAuthUser";
import { apiFetch } from "@/lib/api";
import { describeError, money, stockStatus } from "@/lib/utils";
import type { InventoryItem } from "@/lib/types";
import {
  ArrowLeft,
  Package,
  Pencil,
  Trash2,
  LoaderCircle,
  Calendar,
  FileText,
} from "lucide-react";

function DetailRow({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-medium text-slate-800">
        {value?.trim() ? value : "—"}
      </p>
    </div>
  );
}

export function ItemDetailsView({ itemId }: { itemId: string }) {
  const router = useRouter();

  const { user, checking } = useAuthUser();
  const [item, setItem] = useState<InventoryItem | null>(null);
  const [loadingItem, setLoadingItem] = useState(true);
  const [itemsError, setItemsError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    apiFetch<{ item: InventoryItem }>(`/api/items/${itemId}`)
      .then((r) => {
        if (cancelled) return;
        setItem(r.item);
        setItemsError("");
      })
      .catch((err) => {
        if (cancelled) return;
        // 404 = the product does not exist (the page shows "not found")
        if ((err as { status?: number }).status === 404) setItem(null);
        else setItemsError(describeError(err, "Unable to load this product."));
      })
      .finally(() => {
        if (!cancelled) setLoadingItem(false);
      });

    return () => {
      cancelled = true;
    };
  }, [itemId, user]);

  async function handleDelete() {
    setDeleting(true);
    setItemsError("");
    try {
      await apiFetch(`/api/items/${itemId}`, { method: "DELETE" });
      setConfirmOpen(false);
      router.replace("/dashboard");
    } catch (err) {
      setItemsError(describeError(err, "Could not delete the product. Please try again."));
      setDeleting(false);
    }
  }

  if (checking || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-slate-500">
        Checking your session...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            aria-label="Back to dashboard"
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="rounded-lg bg-blue-600 p-2 text-white">
            <Package size={22} />
          </div>

          <div>
            <h1 className="font-bold">Item Management</h1>
            <p className="text-xs text-slate-500">Inventory / Item Details</p>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-8">
        {itemsError && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700"
          >
            {itemsError}
          </div>
        )}

        {loadingItem ? (
          <p className="py-16 text-center text-sm text-slate-500">
            Loading item details...
          </p>
        ) : !item ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <Package size={32} className="mx-auto mb-3 text-slate-400" />
            <p className="font-medium">Item not found</p>
            <p className="mt-2 text-sm text-slate-500">
              This item may have already been deleted.
            </p>
            <button
              type="button"
              onClick={() => router.replace("/dashboard")}
              className="mt-6 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Back to dashboard
            </button>
          </div>
        ) : (
          <>
            <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold sm:text-3xl">
                  {item.itemName || "Unnamed item"}
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  {item.companyName || "No brand"}
                </p>
              </div>

              <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-700">
                {item.status || "No status"}
              </span>
            </div>

            <div className="space-y-6">
              {(item.mainImage || item.imageUrls?.length) && (
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                  <h3 className="mb-5 font-semibold">Product Details</h3>

                  {item.imageUrls && item.imageUrls.length > 0 && (
                    <div className="mb-6 flex gap-3 overflow-x-auto pb-2">
                      {item.imageUrls.map((url, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={url}
                          src={url}
                          alt={`${item.itemName || "Item"} image ${i + 1}`}
                          className="h-36 w-36 shrink-0 rounded-lg border border-slate-200 object-cover"
                        />
                      ))}
                    </div>
                  )}

                  <div className="grid gap-5 sm:grid-cols-2">
                    <DetailRow label="Category" value={item.category} />
                    <DetailRow label="Selling Price" value={item.sellingPrice != null ? money(item.sellingPrice) : undefined} />
                    <DetailRow label="Stock" value={stockStatus(item.quantity)?.text} />
                    <DetailRow label="Quantity in stock" value={item.quantity != null ? String(item.quantity) : undefined} />
                    <DetailRow label="Shown in store" value={item.published === false ? "No (hidden)" : "Yes"} />
                    <DetailRow label="GST Rate" value={item.gstRate != null ? `${item.gstRate}%` : undefined} />
                    <DetailRow label="Country of Origin" value={item.countryOfOrigin} />
                    <DetailRow label="Warranty" value={item.warranty} />
                  </div>
                </section>
              )}

              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <h3 className="mb-5 font-semibold">Basic Information</h3>

                <div className="grid gap-5 sm:grid-cols-2">
                  <DetailRow label="Item Name" value={item.itemName} />
                  <DetailRow label="Company Name" value={item.companyName} />
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <h3 className="mb-5 flex items-center gap-2 font-semibold">
                  <Calendar size={18} className="text-blue-600" />
                  Purchase &amp; Warranty
                </h3>

                <div className="grid gap-5 sm:grid-cols-2">
                  <DetailRow label="Purchase Date" value={item.purchaseDate} />
                  <DetailRow
                    label="Warranty Expiry"
                    value={item.warrantyExpiry}
                  />
                  <DetailRow label="Status" value={item.status} />
                </div>
              </section>

              {item.notes?.trim() && (
                <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                  <h3 className="mb-5 flex items-center gap-2 font-semibold">
                    <FileText size={18} className="text-blue-600" />
                    Additional Notes
                  </h3>
                  <p className="whitespace-pre-line text-sm leading-6 text-slate-700">
                    {item.notes}
                  </p>
                </section>
              )}

              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-medium hover:bg-slate-100"
                >
                  Back to dashboard
                </button>

                <button
                  type="button"
                  onClick={() => router.push(`/dashboard/items/${itemId}/edit`)}
                  className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                >
                  <Pencil size={18} />
                  Edit Item
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmOpen(true)}
                  className="flex items-center gap-2 rounded-lg border border-red-300 bg-white px-5 py-3 text-sm font-semibold text-red-600 transition hover:bg-red-50"
                >
                  <Trash2 size={18} />
                  Delete Item
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-item-title"
        >
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 id="delete-item-title" className="text-lg font-semibold">
              Delete this item?
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              {item?.itemName || "This item"} will be permanently removed from
              your inventory. This action cannot be undone.
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                disabled={deleting}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium hover:bg-slate-100 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {deleting ? (
                  <LoaderCircle size={17} className="animate-spin" />
                ) : (
                  <Trash2 size={17} />
                )}
                {deleting ? "Deleting..." : "Delete Item"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
