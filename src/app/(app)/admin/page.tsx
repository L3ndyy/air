"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Users, Activity, HardDrive, Zap, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui";

interface Stats {
  users: { total: number; activeLast24h: number };
  server: { uptimeSeconds: number; memoryMB: { rss: number; heapUsed: number } };
  storage: string;
}

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const checkRes = await fetch("/api/admin/check", { credentials: "include" });
      const check = await checkRes.json().catch(() => ({}));
      if (!check.admin) {
        router.replace("/chat");
        return;
      }
      const res = await fetch("/api/admin/stats", { credentials: "include" });
      if (!res.ok) {
        setError("Не удалось загрузить статистику");
        setLoading(false);
        return;
      }
      const data = await res.json();
      setStats(data);
      setLoading(false);
    })();
  }, [router]);

  async function handleOptimize() {
    setOptimizing(true);
    try {
      const res = await fetch("/api/admin/optimize", {
        method: "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      alert(data.message ?? "Готово");
    } finally {
      setOptimizing(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-8">
        <p className="[color:var(--air-text-muted)]">{error ?? "Нет данных"}</p>
        <Link href="/chat">
          <Button variant="secondary">Вернуться в чат</Button>
        </Link>
      </div>
    );
  }

  const uptimeMin = Math.floor(stats.server.uptimeSeconds / 60);

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6 flex items-center gap-4">
          <Link
            href="/chat"
            className="flex items-center gap-2 text-sm [color:var(--air-text-muted)] hover:[color:var(--air-text)]"
          >
            <ArrowLeft className="h-4 w-4" />
            В чат
          </Link>
        </div>
        <h1 className="mb-2 flex items-center gap-2 text-2xl font-semibold [color:var(--air-text)]">
          <Shield className="h-7 w-7 text-indigo-500" />
          Админ-панель
        </h1>
        <p className="mb-8 text-sm [color:var(--air-text-muted)]">
          Статистика и состояние приложения
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-[var(--air-glass-border)] bg-[var(--air-glass)] p-5 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-sm [color:var(--air-text-muted)]">
              <Users className="h-4 w-4" />
              Пользователей
            </div>
            <p className="mt-2 text-2xl font-semibold [color:var(--air-text)]">
              {stats.users.total}
            </p>
            <p className="mt-1 text-xs [color:var(--air-text-muted)]">
              Активных за 24 ч: {stats.users.activeLast24h}
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--air-glass-border)] bg-[var(--air-glass)] p-5 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-sm [color:var(--air-text-muted)]">
              <Activity className="h-4 w-4" />
              Сервер
            </div>
            <p className="mt-2 text-2xl font-semibold [color:var(--air-text)]">
              {uptimeMin} мин
            </p>
            <p className="mt-1 text-xs [color:var(--air-text-muted)]">
              Память: RSS {stats.server.memoryMB.rss} MB, heap {stats.server.memoryMB.heapUsed} MB
            </p>
          </div>

          <div className="rounded-2xl border border-[var(--air-glass-border)] bg-[var(--air-glass)] p-5 backdrop-blur-xl">
            <div className="flex items-center gap-2 text-sm [color:var(--air-text-muted)]">
              <HardDrive className="h-4 w-4" />
              Место / Storage
            </div>
            <p className="mt-2 text-2xl font-semibold [color:var(--air-text)]">
              {stats.storage}
            </p>
          </div>
        </div>

        <div className="mt-8">
          <Button
            onClick={handleOptimize}
            disabled={optimizing}
            className="inline-flex items-center gap-2"
          >
            <Zap className="h-4 w-4" />
            {optimizing ? "Выполняется…" : "Оптимизировать"}
          </Button>
        </div>
      </div>
    </div>
  );
}
