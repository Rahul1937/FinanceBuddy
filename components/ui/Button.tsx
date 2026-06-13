import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

export default function Button({ className, type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
        "fb-btn",
        className
      )}
      {...props}
    />
  );
}
