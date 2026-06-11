import type { ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

interface ModalProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export default function Modal({ title, children, className }: ModalProps) {
  return (
    <div className={cn("fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4", className)}>
      <div className="w-full max-w-2xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-2xl shadow-slate-900/10 dark:border-slate-800 dark:bg-slate-950">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
