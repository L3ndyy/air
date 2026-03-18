"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui";

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = typeof params.token === "string" ? params.token : "";
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Ссылка приглашения не указана");
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/api/invite/join?token=${encodeURIComponent(token)}`, {
          credentials: "include",
        });
        const data = await res.json().catch(() => ({}));
        if (res.status === 401) {
          router.replace(`/login?redirect=${encodeURIComponent(`/invite/${token}`)}`);
          return;
        }
        if (res.ok) {
          const convId = (data as { conversationId?: string }).conversationId;
          if (convId) {
            router.replace(`/chat?conversation=${convId}`);
            return;
          }
        }
        setMessage((data.error as string) || "Ссылка недействительна или истекла");
        setStatus("error");
      } catch {
        setMessage("Ошибка соединения");
        setStatus("error");
      }
    })();
  }, [token, router]);

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="text-sm [color:var(--air-text-muted)]">Присоединяем к группе…</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <p className="text-center text-sm [color:var(--air-text)]">{message}</p>
      <Link href="/chat">
        <Button variant="secondary">В чат</Button>
      </Link>
      <Link href="/login" className="text-xs [color:var(--air-text-muted)] hover:underline">
        Войти в аккаунт
      </Link>
    </div>
  );
}
