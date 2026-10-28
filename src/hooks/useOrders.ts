"use client";

import type { User } from "firebase/auth";
import { apiFetch } from "@/lib/api";
import { usePolling } from "@/hooks/usePolling";
import type { Order } from "@/lib/types";

type OrdersResponse = { orders: Order[]; hasMore: boolean; nextBefore: number | null };

/** "mine" = the customer's own orders, "all" = every order (store staff only). */
export function useOrders(user: User | null, scope: "mine" | "all" = "mine", limit = 200) {
  const { data, loading, error, refresh } = usePolling(
    () =>
      apiFetch<OrdersResponse>(`/api/orders?scope=${scope}&limit=${limit}`).then((r) => ({
        orders: r.orders,
        hasMore: r.hasMore,
      })),
    !!user
  );
  return {
    orders: data?.orders ?? [],
    hasMore: data?.hasMore ?? false,
    loading,
    error,
    refresh,
  };
}
