"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Users, Activity, HardDrive, Zap, ArrowLeft, Wrench, Trash2, Key, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui";

interface Stats {
  users: { total: number; activeLast24h: number };
  conversations?: { total: number };
  messages?: { today: number; week: number };
  server: { uptimeSeconds: number; memoryMB: { rss: number; heapUsed: number } };
  storage: string;
}

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  email_confirmed_at: string | null;
  username: string | null;
  full_name: string | null;
}

export default function AdminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maintenance, setMaintenance] = useState(false);
  const [maintenanceLoading, setMaintenanceLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [passwordId, setPasswordId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const checkRes = await fetch("/api/admin/check", { credentials: "include" });
      const check = await checkRes.json().catch(() => ({}));
      if (!check.admin) {
        router.replace("/chat");
        return;
      }
      const [statsRes, maintRes, usersRes] = await Promise.all([
        fetch("/api/admin/stats", { credentials: "include" }),
        fetch("/api/admin/maintenance", { credentials: "include" }),
        fetch("/api/admin/users", { credentials: "include" }),
      ]);
      if (!statsRes.ok) {
        setError("Не удалось загрузить статистику");
        setLoading(false);
        return;
      }
      const data = await statsRes.json();
      setStats(data);
      try {
        const maint = await maintRes.json();
        setMaintenance(Boolean(maint.maintenance));
      } catch {
        setMaintenance(false);
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setAdminUsers(usersData.users ?? []);
      }
      setLoading(false);
    })();
  }, [router]);

  async function toggleMaintenance() {
    setMaintenanceLoading(true);
    try {
      const res = await fetch(
        `/api/admin/maintenance?maintenance=${!maintenance}`,
        { credentials: "include" }
      );
      if (!res.ok) throw new Error("Ошибка");
      const data = await res.json();
      setMaintenance(Boolean(data.maintenance));
    } catch {
      alert("Не удалось изменить режим");
    } finally {
      setMaintenanceLoading(false);
    }
  }

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

  async function handleDeleteUser(u: AdminUser) {
    if (!confirm(`Удалить пользователя ${u.email} (${u.username ?? u.id})? Это действие нельзя отменить.`)) return;
    setDeletingId(u.id);
    try {
      const url = `/api/admin/users?action=delete&userId=${encodeURIComponent(u.id)}`;
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? "Ошибка удаления");
        return;
      }
      setAdminUsers((prev) => prev.filter((x) => x.id !== u.id));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSetPassword(u: AdminUser) {
    setPasswordId(u.id);
    try {
      const url = `/api/admin/users?action=set_password&userId=${encodeURIComponent(u.id)}`;
      const res = await fetch(url, { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? "Ошибка");
        return;
      }
      const password = data.password as string;
      const msg = `Временный пароль для входа под ${u.email}:\n\n${password}\n\nСкопируйте и сохраните. Пользователю лучше сменить пароль в профиле.`;
      alert(msg);
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(password);
      }
    } finally {
      setPasswordId(null);
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

        <div className="mb-8 flex items-center justify-between gap-4 rounded-2xl border border-[var(--air-glass-border)] bg-[var(--air-glass)] p-5 backdrop-blur-xl">
          <div className="flex items-center gap-2 text-sm [color:var(--air-text)]">
            <Wrench className="h-4 w-4 text-amber-500" />
            Ведётся тех. работы
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={maintenance}
            disabled={maintenanceLoading}
            onClick={toggleMaintenance}
            className={`relative h-7 w-12 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
              maintenance ? "bg-amber-500" : "bg-[var(--air-glass-border)]"
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                maintenance ? "left-6" : "left-1"
              }`}
            />
          </button>
        </div>

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

          {stats.conversations != null && (
            <div className="rounded-2xl border border-[var(--air-glass-border)] bg-[var(--air-glass)] p-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-sm [color:var(--air-text-muted)]">
                <MessageCircle className="h-4 w-4" />
                Чатов
              </div>
              <p className="mt-2 text-2xl font-semibold [color:var(--air-text)]">
                {stats.conversations.total}
              </p>
            </div>
          )}
          {stats.messages != null && (
            <div className="rounded-2xl border border-[var(--air-glass-border)] bg-[var(--air-glass)] p-5 backdrop-blur-xl">
              <div className="flex items-center gap-2 text-sm [color:var(--air-text-muted)]">
                <MessageCircle className="h-4 w-4" />
                Сообщений
              </div>
              <p className="mt-2 text-2xl font-semibold [color:var(--air-text)]">
                {stats.messages.today} / {stats.messages.week}
              </p>
              <p className="mt-1 text-xs [color:var(--air-text-muted)]">
                за день / за неделю
              </p>
            </div>
          )}
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

        <div className="mt-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold [color:var(--air-text)]">
            <Users className="h-5 w-5" />
            Пользователи
          </h2>
          <p className="mb-4 text-xs [color:var(--air-text-muted)]">
            Логин — это email. Пароль в базе хранится в зашифрованном виде, его нельзя посмотреть. Можно задать временный пароль и войти под пользователем.
          </p>
          <div className="rounded-2xl border border-[var(--air-glass-border)] bg-[var(--air-glass)] overflow-hidden">
            <div className="divide-y divide-[var(--air-glass-border)]">
              {adminUsers.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm [color:var(--air-text-muted)]">
                  Нет пользователей
                </div>
              ) : (
                adminUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium [color:var(--air-text)]">
                        {u.email || "—"}
                      </p>
                      <p className="truncate text-xs [color:var(--air-text-muted)]">
                        @{u.username ?? "user"} · {u.full_name || "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleSetPassword(u)}
                        disabled={passwordId !== null}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--air-glass-border)] bg-[var(--air-input-bg)] px-3 py-1.5 text-xs [color:var(--air-text)] hover:bg-[var(--air-glass)] disabled:opacity-50"
                        title="Задать временный пароль и скопировать (чтобы войти под этим пользователем)"
                      >
                        <Key className="h-3.5 w-3.5" />
                        {passwordId === u.id ? "…" : "Временный пароль"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteUser(u)}
                        disabled={deletingId !== null}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-500 hover:bg-red-500/20 disabled:opacity-50"
                        title="Полностью удалить пользователя"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        {deletingId === u.id ? "…" : "Удалить"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
