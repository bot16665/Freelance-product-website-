"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useSession } from "@/hooks/useSession";

/** Wrap staff-only pages. Customers see a friendly "no access" screen instead. */
export function SellerGate({ children }: { children: React.ReactNode }) {
  const { user, role, checking } = useSession();

  if (checking || !user) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500">
        Checking your session...
      </main>
    );
  }

  if (role !== "seller") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6 text-slate-900">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <ShieldAlert size={36} className="mx-auto text-amber-500" />
          <h1 className="mt-4 text-xl font-bold">Store staff only</h1>
          <p className="mt-2 text-sm text-slate-600">
            This area is for the people who manage the store. You can still browse and order from the shop.
          </p>
          <Link
            href="/orders"
            className="mt-5 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
          >
            Go to the shop
          </Link>
          <div className="mt-6 rounded-lg bg-slate-50 p-3 text-left text-xs text-slate-500">
            Are you store staff? Send this ID to the store owner so they can give you access:
            <code className="mt-1 block break-all rounded bg-white px-2 py-1 text-slate-800">{user.uid}</code>
          </div>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
