"use client";

import { motion } from "framer-motion";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading,
      disabled,
      children,
      onDrag,
      onDragStart,
      onDragEnd,
      onDragOver,
      onDragEnter,
      onDragLeave,
      ...props
    },
    ref
  ) => {
    const base =
      "inline-flex items-center justify-center rounded-xl font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";
    const variants = {
      primary:
        "bg-gradient-to-r from-blue-400 to-purple-500 text-white shadow-air hover:from-blue-500 hover:to-purple-600",
      secondary:
        "bg-white/80 backdrop-blur-xl border border-gray-200/60 text-gray-800 shadow-air hover:bg-white hover:border-gray-300/80",
      ghost:
        "text-gray-700 hover:bg-gray-100/80 hover:border-gray-200/60 border border-transparent",
    };
    const sizes = {
      sm: "h-8 px-3 text-sm",
      md: "h-10 px-4 text-sm",
      lg: "h-12 px-6 text-base",
    };

    return (
      <motion.button
        ref={ref}
        className={cn(base, variants[variant], sizes[size], className)}
        whileHover={{ scale: disabled ? 1 : 1.02 }}
        whileTap={{ scale: disabled ? 1 : 0.98 }}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
        ) : (
          children
        )}
      </motion.button>
    );
  }
);

Button.displayName = "Button";

export { Button };
