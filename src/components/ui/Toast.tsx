"use client";

import { useEffect, useRef } from "react";

export type ToastState = { type: "success" | "error"; message: string } | null;

/** Small message in the top-right corner that hides itself after 4 seconds. */
export function Toast({ toast, onClose }: { toast: ToastState; onClose: () => void }) {
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  });

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => closeRef.current(), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!toast) return null;

  return (
    <div
      role="status"
      className={`fixed right-4 top-4 z-50 max-w-sm rounded-lg px-4 py-3 text-sm font-medium text-white shadow-lg ${
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
      }`}
    >
      {toast.message}
    </div>
  );
}
