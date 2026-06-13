import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes } from "react";

export default function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[2rem] p-6 shadow-sm transition-colors",
        "fb-card",
        className
      )}
      {...props}
    />
  );
}
