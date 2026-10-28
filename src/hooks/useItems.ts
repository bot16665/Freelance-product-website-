"use client";

import type { User } from "firebase/auth";
import { apiFetch } from "@/lib/api";
import { usePolling } from "@/hooks/usePolling";
import type { InventoryItem } from "@/lib/types";

/** All products, including hidden ones and private details. Store staff only. */
export function useItems(user: User | null) {
  const { data, loading, error, refresh } = usePolling(
    () => apiFetch<{ items: InventoryItem[] }>("/api/items").then((r) => r.items),
    !!user
  );
  return { items: data ?? [], loading, error, refresh };
}
