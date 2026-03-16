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
            "flex h-10 w-full rounded-xl border border-gray-200/80 bg-white/90 px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400",
            "focus:border-blue-400/60 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400/20",
            "transition-colors",
            error && "border-red-300 focus:border-red-400 focus:ring-red-400/20",
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
