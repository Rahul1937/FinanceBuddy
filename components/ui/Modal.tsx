import type { ReactNode } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

interface ModalProps {
  title: string;
  children: ReactNode;
  className?: string;
  onClose?: () => void;
}

export default function Modal({ title, children, className, onClose }: ModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={cn(
          "relative w-full max-w-lg rounded-[1.5rem] border border-[var(--surface-border)] bg-[var(--surface-card)] p-6 shadow-2xl",
          className
        )}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-[var(--text-muted)] transition hover:bg-[var(--surface-raised)] hover:text-[var(--text-primary)]"
            >
              <X size={18} />
            </button>
          )}
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
