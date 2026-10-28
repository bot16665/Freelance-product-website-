
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { apiFetch } from "@/lib/api";
import { ShieldCheck, Store } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGoogleLogin() {
    setLoading(true);
    setError("");

    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      // Store staff go to the product dashboard, customers go to the shop
      const me = await apiFetch<{ role: string }>("/api/me").catch(() => null);
      router.replace(me?.role === "seller" ? "/dashboard" : "/orders");
    } catch (err) {
      console.error("Google login failed:", err);
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl bg-white shadow-xl md:grid-cols-2">
        <section className="hidden flex-col justify-between bg-slate-900 p-10 text-white md:flex">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/10 p-3">
              <Store size={28} />
            </div>
            <span className="text-lg font-semibold">
              Store Management
            </span>
          </div>

          <div>
            <p className="mb-3 text-sm font-medium text-blue-300">
              ONLINE STORE
            </p>
            <h1 className="text-4xl font-bold leading-tight">
              Shop quality products in one place.
            </h1>
            <p className="mt-4 leading-7 text-slate-300">
              Browse the catalogue, place an order and get your
              invoice. Store staff manage items and orders here too.
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-slate-300">
            <ShieldCheck size={18} />
            Secure Google authentication
          </div>
        </section>

        <section className="flex min-h-[520px] flex-col justify-center p-8 sm:p-12">
          <div className="mb-8 inline-flex w-fit rounded-xl bg-blue-50 p-3 text-blue-700">
            <Store size={28} />
          </div>

          <h2 className="text-3xl font-bold text-slate-900">
            Welcome back
          </h2>
          <p className="mt-2 text-slate-500">
            Sign in to shop, or to manage the store.
          </p>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="mt-8 flex w-full items-center justify-center gap-3 rounded-lg border border-slate-300 px-4 py-3 font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              "Signing in..."
            ) : (
              <>
                <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" transform="translate(0 3)"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.73 7.18l7.64 5.93c4.46-4.12 7.13-10.2 7.13-17.58z"/>
                  <path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a24 24 0 0 0 0 21.56l7.98-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.87l-7.64-5.93c-2.13 1.43-4.85 2.27-8.27 2.27-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          {error && (
            <p role="alert" className="mt-4 text-sm text-red-600">
              {error}
            </p>
          )}

          <p className="mt-6 text-center text-xs text-slate-400">
            New here? Just sign in with Google and start shopping.
          </p>
        </section>
      </div>
    </main>
  );
}
