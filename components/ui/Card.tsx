import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes } from "react";

export default function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5 transition-colors dark:border-slate-800 dark:bg-slate-950",
        className
      )}
      {...props}
    />
  );
}
