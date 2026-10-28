"use client";

import type { User } from "firebase/auth";
import { apiFetch } from "@/lib/api";
import { usePolling } from "@/hooks/usePolling";
import type { InventoryItem } from "@/lib/types";

/** The store: products customers can buy. */
export function useCatalog(user: User | null) {
  const { data, loading, error, refresh } = usePolling(
    () => apiFetch<{ items: InventoryItem[] }>("/api/catalog").then((r) => r.items),
    !!user
  );
  return { items: data ?? [], loading, error, refresh };
}
