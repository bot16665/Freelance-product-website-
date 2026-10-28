"use client";

import { useEffect, useState } from "react";
import { useAuthUser } from "@/hooks/useAuthUser";
import { apiFetch } from "@/lib/api";
import type { Role } from "@/lib/types";

/**
 * Signed-in user + their role (customer or store staff), with one loading flag.
 * The role comes from the server, so it cannot be faked in the browser.
 */
export function useSession() {
  const { user, checking } = useAuthUser();
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    apiFetch<{ role: Role }>("/api/me")
      .then((me) => !cancelled && setRole(me.role))
      .catch(() => !cancelled && setRole("buyer")); // if the server can't be reached, treat as customer
    return () => {
      cancelled = true;
    };
  }, [user]);

  return { user, role, checking: checking || (!!user && role === null) };
}
