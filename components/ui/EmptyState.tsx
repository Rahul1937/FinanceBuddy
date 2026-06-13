import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface EmptyStateProps {
  message: string;
  description?: string;
  icon?: LucideIcon;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export default function EmptyState({ message, description, icon: Icon, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-3xl border border-dashed border-[var(--surface-border)] bg-[var(--surface-raised)] px-8 py-14 text-center",
        className
      )}
    >
      {Icon && (
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--surface-card)]">
          <Icon size={24} className="text-[var(--text-muted)]" />
        </div>
      )}
      <p className="font-display text-base font-semibold text-[var(--text-primary)]">{message}</p>
      {description && <p className="mt-1 text-sm text-[var(--text-muted)]">{description}</p>}
      {action && (
        <button onClick={action.onClick} className="fb-add-btn mt-5 text-xs">
          {action.label}
        </button>
      )}
    </div>
  );
}
