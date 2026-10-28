"use client";

import { useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { onValue, ref } from "firebase/database";
import { rtdb } from "@/lib/firebase";
import type { Role } from "@/lib/types";

/**
 * "seller" = store staff (their uid is listed under /sellers in the database).
 * Everybody else is a "buyer". Only the store owner can edit /sellers, from the
 * Firebase console, so a user can never promote themselves.
 * Returns null while the role is still loading.
 */
export function useRole(user: User | null) {
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    if (!user) return;
    return onValue(
      ref(rtdb, `sellers/${user.uid}`),
      (snap) => setRole(snap.val() === true ? "seller" : "buyer"),
      () => setRole("buyer")
    );
  }, [user]);

  return role;
}
