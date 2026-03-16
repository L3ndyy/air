"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/chat?panel=profile");
  }, [router]);
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
        <p className="text-sm text-gray-500">Открываем профиль...</p>
      </div>
    </div>
  );
}
