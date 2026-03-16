"use client";

import { MessageCircle } from "lucide-react";

export function ChatPlaceholder() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-[var(--air-bg)] text-gray-500">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/80 shadow-air backdrop-blur-xl">
        <MessageCircle className="h-8 w-8 text-gray-400" />
      </div>
      <p className="mt-4 text-sm font-medium text-gray-600">Выберите чат</p>
      <p className="mt-1 text-xs">или создайте новый</p>
    </div>
  );
}
