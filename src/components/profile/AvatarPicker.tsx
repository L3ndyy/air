"use client";

import { useRef, useState } from "react";
import { Avatar } from "@/components/ui";
import { Camera, Smile } from "lucide-react";

const EMOJI_PREFIX = "emoji:";

const EMOJI_LIST = [
  "😀", "😊", "🥳", "😎", "🤩", "😇", "🙂", "😌",
  "🐱", "🐶", "🐻", "🐼", "🦊", "🐨", "🦁", "🐯",
  "🌸", "🌺", "🌻", "🌹", "⭐", "🔥", "💎", "🎯",
  "❤️", "💜", "💙", "💚", "🧡", "🖤", "🤍", "💫",
];

interface AvatarPickerProps {
  currentUrl?: string | null;
  fallback: string;
  onUpload: (file: File) => Promise<void>;
  onEmojiSelect: (emoji: string) => Promise<void>;
  disabled?: boolean;
}

export function AvatarPicker({
  currentUrl,
  fallback,
  onUpload,
  onEmojiSelect,
  disabled,
}: AvatarPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"view" | "emoji">("view");
  const isEmoji = currentUrl?.startsWith(EMOJI_PREFIX);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    await onUpload(file);
    e.target.value = "";
  }

  async function handleEmojiClick(emoji: string) {
    await onEmojiSelect(emoji);
    setMode("view");
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="rounded-full ring-4 ring-white shadow-air-md focus:outline-none focus:ring-2 focus:ring-blue-400/50 disabled:opacity-50"
        >
          <Avatar src={currentUrl} fallback={fallback} size="lg" />
        </button>
        <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-gray-800 text-white shadow-md">
          <Camera className="h-4 w-4" />
        </span>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="sr-only"
          onChange={handleFileChange}
        />
      </div>

      <div className="w-full">
        {mode === "view" ? (
          <button
            type="button"
            onClick={() => setMode("emoji")}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200/80 bg-white/80 py-2.5 text-sm text-gray-600 transition hover:bg-gray-50"
          >
            <Smile className="h-4 w-4" />
            Выбрать эмодзи
          </button>
        ) : (
          <div className="rounded-2xl border border-gray-200/60 bg-white/90 p-3 shadow-air">
            <p className="mb-2 text-center text-xs font-medium text-gray-500">Выберите эмодзи</p>
            <div className="grid grid-cols-8 gap-1">
              {EMOJI_LIST.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleEmojiClick(emoji)}
                  className="rounded-lg p-1.5 text-xl transition hover:bg-gray-100"
                >
                  {emoji}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setMode("view")}
              className="mt-2 w-full rounded-lg py-1.5 text-sm text-gray-500 hover:bg-gray-100"
            >
              Отмена
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
