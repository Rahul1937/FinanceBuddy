import type { ReactNode } from "react";
import AppGuard from "@/components/layout/AppGuard";

export default function AppRoutesLayout({ children }: { children: ReactNode }) {
  return <AppGuard>{children}</AppGuard>;
}
