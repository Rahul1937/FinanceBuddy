"use client";

import { useEffect } from "react";

// Retention trigger: asks the server to roll up + delete transactions older than
// the current + previous 2 months. Runs at most once per day (throttled via
// localStorage) so the free-tier database never accumulates more than 3 months
// of raw transactions. The KEY is versioned — bumping it forces one fresh run
// after a retention-logic change, ignoring the previous day's throttle.
const KEY = "fb_last_prune_v2";
const DAY_MS = 86_400_000;

export default function PruneOnLoad() {
  useEffect(() => {
    try {
      const last = Number(localStorage.getItem(KEY) || 0);
      if (Date.now() - last < DAY_MS) return;
    } catch {
      // ignore storage errors and just run
    }
    fetch("/api/maintenance/prune", { method: "POST" })
      .then(() => {
        try {
          localStorage.setItem(KEY, String(Date.now()));
        } catch {}
      })
      .catch(() => {});
  }, []);

  return null;
}
