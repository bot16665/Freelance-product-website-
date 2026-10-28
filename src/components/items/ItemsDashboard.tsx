"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { isSellable } from "@/lib/utils";
import { useItems } from "@/hooks/useItems";
import { AppHeader } from "@/components/layout/AppHeader";
import { ItemCard } from "./ItemCard";

export function ItemsDashboard() {
  const router = useRouter();
  const { user, role, checking } = useSession();
  const { items, loading, error, refresh } = useItems(user);
  const [search, setSearch] = useState("");

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((i) =>
      [i.itemName, i.companyName, i.category].some((v) =>
        v?.toLowerCase().includes(term)
      )
    );
  }, [items, search]);

  const stats = useMemo(
    () => ({
      total: items.length,
      live: items.filter(isSellable).length,
      low: items.filter((i) => (i.quantity ?? 0) > 0 && (i.quantity ?? 0) <= 5).length,
      out: items.filter((i) => i.quantity === 0).length,
    }),
    [items]
  );

  if (checking || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Checking your session...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <AppHeader user={user} role={role} active="items" />

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Items</h1>
            <p className="mt-2 text-sm text-slate-500">Add and manage what the store sells. Customers only see items marked &ldquo;Live in store&rdquo;.</p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard/items/new")}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              <Plus size={18} />
              Add Item
            </button>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-4">
          {[
            ["Total items", stats.total, "text-slate-900"],
            ["Live in store", stats.live, "text-blue-600"],
            ["Low stock", stats.low, "text-amber-600"],
            ["Out of stock", stats.out, "text-red-600"],
          ].map(([label, value, color]) => (
            <div key={label as string} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
              <p className={`mt-1 text-2xl font-bold ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        <div className="relative mb-6">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="Search by name, brand, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {error && (
          <p role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}

        {loading ? (
          <p className="py-16 text-center text-sm text-slate-500">Loading items...</p>
        ) : items.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <p className="font-medium">No items yet</p>
            <p className="mt-2 text-sm text-slate-500">Add your first item to get started.</p>
            <button
              type="button"
              onClick={() => router.push("/dashboard/items/new")}
              className="mt-6 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add Item
            </button>
          </div>
        ) : visible.length === 0 ? (
          <p className="py-10 text-center text-sm text-slate-500">No items match your search.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((item) => (
              <ItemCard key={item.id} item={item} onDeleted={refresh} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
