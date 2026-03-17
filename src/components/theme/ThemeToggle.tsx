"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm transition-colors duration-200 hover:bg-[var(--air-glass)] [color:var(--air-text-muted)] hover:[color:var(--air-text)]"
      aria-label={theme === "light" ? "Включить тёмную тему" : "Включить светлую тему"}
    >
      {theme === "light" ? (
        <Moon className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4" />
      )}
      <span>{theme === "light" ? "Тёмная тема" : "Светлая тема"}</span>
    </button>
  );
}
