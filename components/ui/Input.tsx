import React from "react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

const Input = React.forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, type = "text", ...props },
  ref
) {
  return (
    <input
      ref={ref}
      type={type}
      className={cn("w-full text-sm outline-none transition", "fb-input", className)}
      {...props}
    />
  );
});

export default Input;
