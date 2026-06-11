import { cn } from "@/lib/utils/cn";

export default function EmptyState({ message, className }: { message: string; className?: string }) {
  return (
    <div className={cn("rounded-3xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300", className)}>
      <p>{message}</p>
    </div>
  );
}
