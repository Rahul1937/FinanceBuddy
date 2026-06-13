import { cn } from "@/lib/utils/cn";

type Variant = "default" | "success" | "danger" | "warning" | "income" | "expense";

const variants: Record<Variant, string> = {
  default: "bg-[var(--surface-raised)] text-[var(--text-secondary)]",
  success: "bg-[var(--positive-soft)] text-[var(--positive)]",
  income: "bg-[var(--positive-soft)] text-[var(--positive)]",
  danger: "bg-[rgba(220,38,38,0.10)] text-[var(--danger)]",
  expense: "bg-[var(--brand-soft)] text-[var(--brand)]",
  warning: "bg-[rgba(217,119,6,0.12)] text-[var(--warning)]",
};

export default function Badge({
  children,
  className,
  variant = "default",
}: {
  children: React.ReactNode;
  className?: string;
  variant?: Variant;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
