import type { ReactNode } from "react";

export default function Modal({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="w-full max-w-xl rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
