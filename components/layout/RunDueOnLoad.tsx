"use client";

import { useEffect } from "react";

// Posts any due auto-post recurring rules. Runs once per browser session so
// bills auto-add promptly without hammering the endpoint on every navigation.
const KEY = "fb_rundue";

export default function RunDueOnLoad() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY)) return;
    } catch {
      // ignore
    }
    fetch("/api/recurring/run-due", { method: "POST" })
      .then(() => {
        try {
          sessionStorage.setItem(KEY, "1");
        } catch {}
      })
      .catch(() => {});
  }, []);

  return null;
}
