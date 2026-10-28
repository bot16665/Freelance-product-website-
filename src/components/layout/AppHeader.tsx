"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { ClipboardList, LogOut, Package, Store, Users } from "lucide-react";
import type { Role } from "@/lib/types";

type Active = "items" | "staffOrders" | "staff" | "shop";

const sellerLinks = [
  { key: "items", href: "/dashboard", label: "Products", icon: Package },
  { key: "staffOrders", href: "/dashboard/orders", label: "Customer orders", icon: ClipboardList },
  { key: "staff", href: "/dashboard/staff", label: "Staff", icon: Users },
  { key: "shop", href: "/orders", label: "View store", icon: Store },
] as const;

const buyerLinks = [{ key: "shop", href: "/orders", label: "Shop & my orders", icon: Store }] as const;

export function AppHeader({ user, role, active }: { user: User; role: Role | null; active: Active }) {
  const router = useRouter();
  const links = role === "seller" ? sellerLinks : buyerLinks;

  async function handleSignOut() {
    await signOut(auth);
    router.replace("/");
  }

  return (
    <header className="border-b border-slate-200 bg-white px-5 py-3 sm:px-8">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-600 p-2 text-white">
              <Package size={22} />
            </div>
            <span className="font-bold">Online Store</span>
          </div>

          <nav className="flex flex-wrap gap-1">
            {links.map(({ key, href, label, icon: Icon }) => (
              <Link
                key={key}
                href={href}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                  active === key ? "bg-blue-50 text-blue-700" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Icon size={16} />
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {role && (
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                role === "seller" ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {role === "seller" ? "Store staff" : "Customer"}
            </span>
          )}
          <span className="hidden text-sm text-slate-500 sm:block">{user.displayName || user.email}</span>
          <button
            type="button"
            onClick={handleSignOut}
            className="flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-100"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
