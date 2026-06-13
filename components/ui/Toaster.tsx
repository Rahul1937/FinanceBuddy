"use client";

import { Toaster as SonnerToaster } from "sonner";

export default function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      toastOptions={{
        style: {
          background: "var(--surface-card)",
          color: "var(--text-primary)",
          border: "1px solid var(--surface-border)",
          borderRadius: "0.85rem",
          boxShadow: "var(--shadow-card)",
          fontSize: "0.85rem",
        },
      }}
    />
  );
}
