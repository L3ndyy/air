"use client";

import { useState, useCallback } from "react";
import { MessageCircle } from "lucide-react";

const PARALLAX_FACTOR_BG = 0.02;
const PARALLAX_FACTOR_ICON = 0.04;

export function ChatPlaceholder() {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });

  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const x = (e.clientX - centerX) * PARALLAX_FACTOR_BG;
    const y = (e.clientY - centerY) * PARALLAX_FACTOR_BG;
    setMouse({ x, y });
  }, []);

  const iconX = mouse.x * (PARALLAX_FACTOR_ICON / PARALLAX_FACTOR_BG);
  const iconY = mouse.y * (PARALLAX_FACTOR_ICON / PARALLAX_FACTOR_BG);

  return (
    <div
      className="relative flex flex-1 flex-col items-center justify-center overflow-hidden text-gray-500"
      onMouseMove={onMouseMove}
      onMouseLeave={() => setMouse({ x: 0, y: 0 })}
    >
      {/* Glow orbs (background) */}
      <div
        className="pointer-events-none absolute left-1/4 top-1/3 h-64 w-64 rounded-full bg-indigo-400/20 blur-3xl"
        style={{
          transform: `translate(${mouse.x}px, ${mouse.y}px)`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute bottom-1/4 right-1/4 h-80 w-80 rounded-full bg-purple-400/15 blur-3xl"
        style={{
          transform: `translate(${-mouse.x * 0.8}px, ${-mouse.y * 0.8}px)`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-1/3 top-1/2 h-40 w-40 rounded-full bg-blue-400/10 blur-2xl"
        style={{
          transform: `translate(${mouse.x * 1.2}px, ${mouse.y * 1.2}px)`,
        }}
        aria-hidden
      />

      {/* Center content with parallax */}
      <div
        className="relative z-10 flex flex-col items-center text-center"
        style={{
          transform: `translate(${iconX}px, ${iconY}px)`,
        }}
      >
        <div className="flex h-24 w-24 items-center justify-center rounded-3xl border border-[var(--air-glass-border)] bg-[var(--air-glass)] shadow-glow backdrop-blur-xl">
          <MessageCircle className="h-12 w-12 text-indigo-400/80" />
        </div>
        <h2 className="mt-6 text-lg font-semibold text-gray-700">Выберите чат</h2>
        <p className="mt-1 text-sm text-air-muted">или создайте новый</p>
      </div>
    </div>
  );
}
