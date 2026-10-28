"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, type User } from "firebase/auth";
import { auth } from "@/lib/firebase";

/** Waits for Firebase Auth, and sends signed-out visitors to the login page. */
export function useAuthUser() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setChecking(false);
      if (!currentUser) router.replace("/");
    });
    return unsubscribe;
  }, [router]);

  return { user, checking };
}
