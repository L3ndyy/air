import { Crown } from "lucide-react";

interface PremiumBadgeProps {
  className?: string;
  size?: "sm" | "md";
}

export function PremiumBadge({ className = "", size = "sm" }: PremiumBadgeProps) {
  const iconClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-amber-500/20 text-amber-500 ${className}`}
      title="Премиум"
      aria-label="Премиум"
    >
      <Crown className={iconClass} />
    </span>
  );
}
