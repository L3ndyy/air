"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, error, type = "text", ...props }, ref) => {
    return (
      <div className="w-full">
        <input
          type={type}
          ref={ref}
          className={cn(
            "flex h-10 w-full rounded-xl border border-[var(--air-glass-border)] bg-[var(--air-input-bg)] px-3 py-2 text-sm [color:var(--air-text)] placeholder:[color:var(--air-text-muted)]",
            "focus:border-indigo-400/60 focus:outline-none focus:ring-2 focus:ring-indigo-400/20",
            "transition-colors",
            error && "border-red-400 focus:border-red-400 focus:ring-red-400/20",
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-red-500">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export { Input };
