"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { describeError } from "@/lib/utils";

/**
 * Loads data from the server, then keeps it fresh: every 15 seconds while the tab is open,
 * and again whenever you come back to the tab. `refresh()` reloads right now (use it after saving).
 */
export function usePolling<T>(load: () => Promise<T>, enabled: boolean, intervalMs = 15000) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  });

  const refresh = useCallback(async () => {
    try {
      setData(await loadRef.current());
      setError("");
    } catch (err) {
      setError(describeError(err, "Unable to load data."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    refresh();
    const tick = () => document.visibilityState === "visible" && refresh();
    const timer = setInterval(tick, intervalMs);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", tick);
    };
  }, [enabled, refresh, intervalMs]);

  return { data, loading, error, refresh };
}
