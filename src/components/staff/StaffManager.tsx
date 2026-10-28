"use client";

import { useState } from "react";
import { LoaderCircle } from "lucide-react";
import { useSession } from "@/hooks/useSession";
import { usePolling } from "@/hooks/usePolling";
import { apiFetch } from "@/lib/api";
import { describeError, formatDate } from "@/lib/utils";
import { AppHeader } from "@/components/layout/AppHeader";
import { Toast, type ToastState } from "@/components/ui/Toast";

type StaffUser = {
  uid: string;
  email: string | null;
  name: string | null;
  lastSeen: number;
  isOwner: boolean;
  isSeller: boolean;
};

/** Store staff can promote a customer to staff (or remove them). No console or user IDs needed. */
export function StaffManager() {
  const { user, role, checking } = useSession();
  const { data, loading, error, refresh } = usePolling(
    () => apiFetch<{ users: StaffUser[] }>("/api/staff").then((r) => r.users),
    !!user
  );
  const [busyUid, setBusyUid] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const [query, setQuery] = useState("");

  if (checking || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Checking your session...
      </main>
    );
  }

  async function toggle(u: StaffUser) {
    setBusyUid(u.uid);
    try {
      await apiFetch("/api/staff", { method: "PATCH", body: { uid: u.uid, seller: !u.isSeller } });
      setToast({
        type: "success",
        message: u.isSeller ? `${u.email ?? "User"} is now a customer.` : `${u.email ?? "User"} is now store staff.`,
      });
      await refresh();
    } catch (err) {
      setToast({ type: "error", message: describeError(err, "Could not change access.") });
    } finally {
      setBusyUid(null);
    }
  }

  const q = query.trim().toLowerCase();
  const users = (data ?? []).filter((u) => !q || `${u.email ?? ""} ${u.name ?? ""}`.toLowerCase().includes(q));

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <Toast toast={toast} onClose={() => setToast(null)} />
      <AppHeader user={user} role={role} active="staff" />

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-8">
        <h1 className="text-2xl font-bold sm:text-3xl">Staff access</h1>
        <p className="mt-2 text-sm text-slate-500">
          Everyone who has signed in appears here. Give someone <strong>store staff</strong> access so they can manage
          products and orders. A new person must sign in once before you can find them.
        </p>

        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email..."
          className="mt-5 w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />

        {error && (
          <p role="alert" className="mt-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        )}

        {loading ? (
          <p className="py-16 text-center text-sm text-slate-500">Loading users...</p>
        ) : (
          <ul className="mt-5 divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white shadow-sm">
            {users.length === 0 && <li className="p-6 text-center text-sm text-slate-500">No users found.</li>}
            {users.map((u) => (
              <li key={u.uid} className="flex flex-wrap items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="truncate font-medium">{u.name || u.email || u.uid}</p>
                  <p className="truncate text-xs text-slate-500">
                    {u.email} · last seen {formatDate(u.lastSeen)}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      u.isOwner
                        ? "bg-amber-100 text-amber-700"
                        : u.isSeller
                          ? "bg-violet-100 text-violet-700"
                          : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {u.isOwner ? "Owner" : u.isSeller ? "Store staff" : "Customer"}
                  </span>
                  {!u.isOwner && u.uid !== user.uid && (
                    <button
                      type="button"
                      onClick={() => toggle(u)}
                      disabled={busyUid === u.uid}
                      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium disabled:opacity-60 ${
                        u.isSeller
                          ? "border border-red-300 text-red-600 hover:bg-red-50"
                          : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                    >
                      {busyUid === u.uid && <LoaderCircle size={14} className="animate-spin" />}
                      {u.isSeller ? "Remove staff access" : "Make staff"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </main>
  );
}
