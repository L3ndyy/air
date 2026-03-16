"use client";

import { useRef } from "react";
import { Avatar } from "@/components/ui";
import { Camera } from "lucide-react";

interface AvatarUploadProps {
  currentUrl?: string | null;
  fallback: string;
  onUpload: (file: File) => Promise<void>;
  disabled?: boolean;
}

export function AvatarUpload({
  currentUrl,
  fallback,
  onUpload,
  disabled,
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    await onUpload(file);
    e.target.value = "";
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className="rounded-full ring-2 ring-white shadow-air focus:outline-none focus:ring-2 focus:ring-blue-400/50 disabled:opacity-50"
      >
        <Avatar src={currentUrl} fallback={fallback} size="lg" />
      </button>
      <span className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-gray-800 text-white">
        <Camera className="h-4 w-4" />
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="sr-only"
        onChange={handleChange}
      />
    </div>
  );
}
