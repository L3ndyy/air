"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface AvatarProps {
  src?: string | null;
  alt?: string;
  fallback?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizes = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((s) => s[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function Avatar({
  src,
  alt = "",
  fallback = "?",
  size = "md",
  className,
}: AvatarProps) {
  const initials = getInitials(fallback || "?");

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-blue-200 to-purple-200 text-gray-700 font-medium",
        sizes[size],
        className
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt || fallback}
          width={size === "sm" ? 32 : size === "lg" ? 48 : 40}
          height={size === "sm" ? 32 : size === "lg" ? 48 : 40}
          className="h-full w-full object-cover"
          unoptimized={src.startsWith("blob:") || src.includes("supabase")}
        />
      ) : (
        <span>{initials}</span>
      )}
    </span>
  );
}
