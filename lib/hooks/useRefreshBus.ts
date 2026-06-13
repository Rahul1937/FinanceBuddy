"use client";

import { useEffect, useRef } from "react";

// Tiny pub/sub so a mutation anywhere (e.g. the global quick-add) can tell the
// currently-mounted pages to refetch — without a full data-layer refactor.
const EVENT = "fb:refresh";

export function emitRefresh() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

export function useRefreshListener(cb: () => void) {
  const ref = useRef(cb);
  ref.current = cb;
  useEffect(() => {
    const handler = () => ref.current();
    window.addEventListener(EVENT, handler);
    return () => window.removeEventListener(EVENT, handler);
  }, []);
}
