"use client";

import { useRef, useEffect } from "react";
import { EMOJI_LIST } from "@/lib/emoji";

interface EmojiPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  anchorRef: React.RefObject<HTMLElement | null>;
}

export function EmojiPicker({ open, onClose, onSelect, anchorRef }: EmojiPickerProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        anchorRef.current && !anchorRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onClose, anchorRef]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="absolute bottom-full left-0 z-50 mb-1 rounded-2xl border border-[var(--air-glass-border)] bg-[var(--air-surface)] p-2 shadow-lg"
    >
      <p className="mb-2 text-center text-xs [color:var(--air-text-muted)]">Эмодзи</p>
      <div className="grid grid-cols-8 gap-0.5">
        {EMOJI_LIST.map((emoji) => (
          <button
            key={emoji}
            type="button"
            onClick={() => {
              onSelect(emoji);
              onClose();
            }}
            className="rounded-lg p-1.5 text-xl transition hover:bg-[var(--air-glass)]"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}
