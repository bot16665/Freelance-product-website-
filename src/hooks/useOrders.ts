"use client";

import type { User } from "firebase/auth";
import { apiFetch } from "@/lib/api";
import { usePolling } from "@/hooks/usePolling";
import type { Order } from "@/lib/types";

/** "mine" = the customer's own orders, "all" = every order (store staff only). */
export function useOrders(user: User | null, scope: "mine" | "all" = "mine") {
  const { data, loading, error, refresh } = usePolling(
    () => apiFetch<{ orders: Order[] }>(`/api/orders?scope=${scope}`).then((r) => r.orders),
    !!user
  );
  return { orders: data ?? [], loading, error, refresh };
}
