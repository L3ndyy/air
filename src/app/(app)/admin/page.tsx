"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Users, Activity, HardDrive, Zap, ArrowLeft, Wrench, Trash2, Key, MessageCircle, Flag, EyeOff, Ban, CheckCircle, Crown } from "lucide-react";
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
  is_premium?: boolean;
}

interface AdminReport {
  id: string;
  message_id: string;
  reporter_id: string;
  reporter_username: string | null;
  reporter_name: string | null;
  reason: string | null;
  created_at: string;
  message_content: string | null;
  message_created_at: string | null;
  message_hidden: boolean;
  author_id: string | null;
  author_username: string | null;
  author_name: string | null;
  conversation_id: string | null;
}

interface ModerationLog {
  id: string;
  action: string;
  report_id: string | null;
  message_id: string | null;
  created_at: string;
  target_username: string | null;
  target_name: string | null;
  admin_username: string | null;
  admin_name: string | null;
  details: any | null;
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
  const [premiumTogglingId, setPremiumTogglingId] = useState<string | null>(null);
  const [reports, setReports] = useState<AdminReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const [supportReplyReportId, setSupportReplyReportId] = useState<string | null>(null);
  const [supportReplyText, setSupportReplyText] = useState("");
  const [supportReplySending, setSupportReplySending] = useState(false);

  const [moderationLogs, setModerationLogs] = useState<ModerationLog[]>([]);
  const [moderationLogsLoading, setModerationLogsLoading] = useState(false);

  const [reasonFilter, setReasonFilter] = useState("");
  const [chatFilter, setChatFilter] = useState<string>("all");
  const [authorFilter, setAuthorFilter] = useState("");

  useEffect(() => {
    (async () => {
      const checkRes = await fetch("/api/admin/check", { credentials: "include" });
      const check = await checkRes.json().catch(() => ({}));
      if (!check.admin) {
        router.replace("/chat");
        return;
      }
      const [statsRes, maintRes, usersRes, reportsRes, logsRes] = await Promise.all([
        fetch("/api/admin/stats", { credentials: "include" }),
        fetch("/api/admin/maintenance", { credentials: "include" }),
        fetch("/api/admin/users", { credentials: "include" }),
        fetch("/api/admin/reports", { credentials: "include" }),
        fetch("/api/admin/moderation-logs", { credentials: "include" }),
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
      if (reportsRes.ok) {
        const reportsData = await reportsRes.json();
        setReports(Array.isArray(reportsData) ? reportsData : []);
      } else if (reportsRes.status === 403) {
        setReports([]);
        console.warn("Доступ к жалобам запрещён. Добавьте email в переменную ADMIN_EMAILS.");
      }
      if (logsRes.ok) {
        const logsData = await logsRes.json();
        setModerationLogs(Array.isArray(logsData) ? logsData : []);
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

  async function fetchReports() {
    setReportsLoading(true);
    try {
      const res = await fetch("/api/admin/reports", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setReports(Array.isArray(data) ? data : []);
      } else if (res.status === 403) {
        setReports([]);
      }
    } finally {
      setReportsLoading(false);
    }
  }

  async function fetchModerationLogs() {
    setModerationLogsLoading(true);
    try {
      const res = await fetch("/api/admin/moderation-logs", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setModerationLogs(Array.isArray(data) ? data : []);
      } else {
        setModerationLogs([]);
      }
    } finally {
      setModerationLogsLoading(false);
    }
  }

  async function handleResolveReport(reportId: string, action: "dismiss" | "hide" | "delete" | "ban", banDays?: number) {
    const confirmMsg =
      action === "dismiss"
        ? "Отклонить жалобу (удалить только запись о жалобе)?"
        : action === "hide"
          ? "Скрыть сообщение из чата?"
          : action === "delete"
            ? "Удалить сообщение навсегда?"
            : `Забанить автора на ${banDays ?? 1} дн.? Сообщение будет скрыто.`;
    if (!confirm(confirmMsg)) return;
    setResolvingId(reportId);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action, banDays: banDays ?? 1 }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? "Ошибка");
        return;
      }
      await fetchReports();
      await fetchModerationLogs();
    } finally {
      setResolvingId(null);
    }
  }

  async function handleSendSupportReply(reporterUserId: string, reportId: string) {
    const text = supportReplyText.trim();
    if (!text) return;
    setSupportReplySending(true);
    try {
      const res = await fetch("/api/support/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ message: text, targetUserId: reporterUserId, reportId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? "Ошибка отправки ответа");
        return;
      }
      setSupportReplyReportId(null);
      setSupportReplyText("");
    } finally {
      setSupportReplySending(false);
    }

    await fetchModerationLogs();
  }

  const chatOptions = useMemo(() => {
    return Array.from(
      new Set(reports.map((r) => r.conversation_id).filter((x): x is string => Boolean(x)))
    );
  }, [reports]);

  const filteredReports = useMemo(() => {
    const reason = reasonFilter.trim().toLowerCase();
    const author = authorFilter.trim().toLowerCase();

    return reports.filter((r) => {
      if (reason && !(r.reason ?? "").toLowerCase().includes(reason)) return false;
      if (chatFilter !== "all" && r.conversation_id !== chatFilter) return false;
      if (author) {
        const hay = `${r.author_username ?? ""} ${r.author_name ?? ""} ${r.author_id ?? ""}`.toLowerCase();
        if (!hay.includes(author)) return false;
      }
      return true;
    });
  }, [reports, reasonFilter, chatFilter, authorFilter]);

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

  async function handleTogglePremium(u: AdminUser) {
    setPremiumTogglingId(u.id);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "set_premium", userId: u.id, is_premium: !u.is_premium }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? "Ошибка");
        return;
      }
      setAdminUsers((prev) =>
        prev.map((x) => (x.id === u.id ? { ...x, is_premium: !x.is_premium } : x))
      );
    } finally {
      setPremiumTogglingId(null);
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
                      <p className="truncate font-medium [color:var(--air-text)] flex items-center gap-1.5">
                        {u.email || "—"}
                        {u.is_premium && (
                          <span title="Премиум" className="shrink-0">
                            <Crown className="h-3.5 w-3.5 text-amber-500" />
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs [color:var(--air-text-muted)]">
                        @{u.username ?? "user"} · {u.full_name || "—"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleTogglePremium(u)}
                        disabled={premiumTogglingId !== null}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50 ${
                          u.is_premium
                            ? "border-amber-500/50 bg-amber-500/20 text-amber-600 dark:text-amber-400"
                            : "border-[var(--air-glass-border)] bg-[var(--air-input-bg)] [color:var(--air-text)] hover:bg-[var(--air-glass)]"
                        }`}
                        title={u.is_premium ? "Отозвать премиум" : "Выдать премиум"}
                      >
                        <Crown className="h-3.5 w-3.5" />
                        {premiumTogglingId === u.id ? "…" : u.is_premium ? "Премиум ✓" : "Премиум"}
                      </button>
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

        <div className="mt-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold [color:var(--air-text)]">
            <Flag className="h-5 w-5 text-amber-500" />
            Жалобы на сообщения
          </h2>
          <p className="mb-4 text-xs [color:var(--air-text-muted)]">
            Ответ на жалобы: отклонить, скрыть сообщение, удалить сообщение или забанить автора.
          </p>
          <div className="rounded-2xl border border-[var(--air-glass-border)] bg-[var(--air-glass)] overflow-hidden">
            <div className="flex flex-wrap items-center gap-2 border-b border-[var(--air-glass-border)] p-4">
              <input
                value={reasonFilter}
                onChange={(e) => setReasonFilter(e.target.value)}
                placeholder="Фильтр: причина"
                className="w-full rounded-xl border border-[var(--air-glass-border)] bg-[var(--air-input-bg)] px-3 py-2 text-sm [color:var(--air-text)] placeholder:[color:var(--air-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--air-accent)]/20"
              />
              <select
                value={chatFilter}
                onChange={(e) => setChatFilter(e.target.value)}
                className="w-full rounded-xl border border-[var(--air-glass-border)] bg-[var(--air-input-bg)] px-3 py-2 text-sm [color:var(--air-text)] focus:outline-none focus:ring-2 focus:ring-[var(--air-accent)]/20"
              >
                <option value="all">Все чаты</option>
                {chatOptions.map((id) => (
                  <option key={id} value={id}>
                    Chat {id.slice(0, 8)}
                  </option>
                ))}
              </select>
              <input
                value={authorFilter}
                onChange={(e) => setAuthorFilter(e.target.value)}
                placeholder="Фильтр: автор (username/id)"
                className="w-full rounded-xl border border-[var(--air-glass-border)] bg-[var(--air-input-bg)] px-3 py-2 text-sm [color:var(--air-text)] placeholder:[color:var(--air-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--air-accent)]/20"
              />
              <button
                type="button"
                onClick={() => {
                  setReasonFilter("");
                  setChatFilter("all");
                  setAuthorFilter("");
                }}
                className="rounded-xl border border-[var(--air-glass-border)] bg-[var(--air-input-bg)] px-3 py-2 text-xs [color:var(--air-text-muted)] hover:bg-[var(--air-glass)]"
              >
                Сбросить
              </button>
            </div>
            {reportsLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--air-accent)] border-t-transparent" />
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm [color:var(--air-text-muted)]">
                <p>Нет жалоб</p>
                <p className="mt-2 text-xs opacity-80">
                  Жалобы появляются после нажатия «Пожаловаться» в контекстном меню сообщения. В .env должна быть задана переменная ADMIN_EMAILS с email администратора.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--air-glass-border)]">
                {filteredReports.map((r) => (
                  <div
                    key={r.id}
                    className="px-4 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium [color:var(--air-text)]">
                          Жалоба от @{r.reporter_username ?? r.reporter_id.slice(0, 8)}
                          {r.reporter_name && ` (${r.reporter_name})`}
                        </p>
                        <p className="mt-0.5 text-xs [color:var(--air-text-muted)]">
                          {new Date(r.created_at).toLocaleString("ru-RU")}
                          {r.reason && ` · ${r.reason}`}
                        </p>
                    <div className="mt-1.5 whitespace-pre-wrap break-words rounded-lg bg-[var(--air-input-bg)] px-3 py-2 text-sm [color:var(--air-text)]">
                          {r.message_content ?? "(пустое сообщение)"}
                    </div>
                    <p className="mt-1 text-xs [color:var(--air-text-muted)]">
                      Сообщение:{" "}
                      {r.message_created_at ? new Date(r.message_created_at).toLocaleString("ru-RU") : "—"}
                      {r.message_hidden ? " · скрыто" : ""}
                    </p>
                        <p className="mt-1 text-xs [color:var(--air-text-muted)]">
                          Автор: @{r.author_username ?? r.author_id?.slice(0, 8)}
                          {r.author_name && ` (${r.author_name})`}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleResolveReport(r.id, "dismiss")}
                          disabled={resolvingId !== null}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--air-glass-border)] bg-[var(--air-input-bg)] px-2.5 py-1.5 text-xs [color:var(--air-text)] hover:bg-[var(--air-glass)] disabled:opacity-50"
                          title="Отклонить жалобу"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          Отклонить
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResolveReport(r.id, "hide")}
                          disabled={resolvingId !== null}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-600 hover:bg-amber-500/20 disabled:opacity-50"
                          title="Скрыть сообщение"
                        >
                          <EyeOff className="h-3.5 w-3.5" />
                          Скрыть
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResolveReport(r.id, "delete")}
                          disabled={resolvingId !== null}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-xs text-red-500 hover:bg-red-500/20 disabled:opacity-50"
                          title="Удалить сообщение"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Удалить
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResolveReport(r.id, "ban", 1)}
                          disabled={resolvingId !== null}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-500/50 bg-red-500/15 px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-500/25 disabled:opacity-50"
                          title="Забанить автора на 1 день"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          Бан 1 дн.
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSupportReplyReportId(r.id);
                            setSupportReplyText("");
                          }}
                          disabled={resolvingId !== null || supportReplySending}
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--air-glass-border)] bg-[var(--air-input-bg)] px-2.5 py-1.5 text-xs [color:var(--air-text)] hover:bg-[var(--air-glass)] disabled:opacity-50"
                          title="Ответить автору жалобы в поддержку"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          Ответить
                        </button>
                      </div>
                    </div>
                    {supportReplyReportId === r.id && (
                      <div className="mt-3 space-y-2">
                        <textarea
                          value={supportReplyText}
                          onChange={(e) => setSupportReplyText(e.target.value)}
                          placeholder="Ответ для поддержки…"
                          className="min-h-[80px] w-full resize-none rounded-xl border border-[var(--air-glass-border)] bg-[var(--air-input-bg)] px-3 py-2 text-sm [color:var(--air-text)] placeholder:[color:var(--air-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--air-accent)]/20"
                          maxLength={2000}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => {
                              setSupportReplyReportId(null);
                              setSupportReplyText("");
                            }}
                            disabled={supportReplySending}
                            size="sm"
                          >
                            Отмена
                          </Button>
                          <Button
                            type="button"
                            onClick={() => handleSendSupportReply(r.reporter_id, r.id)}
                            disabled={supportReplySending || !supportReplyText.trim()}
                            size="sm"
                            className="bg-[var(--air-accent)] hover:opacity-90"
                          >
                            {supportReplySending ? "Отправка…" : "Отправить"}
                          </Button>
                        </div>
                      </div>
                    )}
                    {resolvingId === r.id && (
                      <div className="mt-2 text-xs [color:var(--air-text-muted)]">Обработка…</div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="mt-10">
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold [color:var(--air-text)]">
            <Activity className="h-5 w-5 text-indigo-500" />
            Логи модерации
          </h2>
          <div className="rounded-2xl border border-[var(--air-glass-border)] bg-[var(--air-glass)] overflow-hidden">
            {moderationLogsLoading ? (
              <div className="flex justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--air-accent)] border-t-transparent" />
              </div>
            ) : moderationLogs.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm [color:var(--air-text-muted)]">Пока нет логов</div>
            ) : (
              <div className="divide-y divide-[var(--air-glass-border)]">
                {moderationLogs.map((l) => (
                  <div key={l.id} className="px-4 py-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium [color:var(--air-text)]">
                          {l.action}
                          {l.report_id ? ` · report ${l.report_id.slice(0, 8)}` : ""}
                          {l.message_id ? ` · msg ${l.message_id.slice(0, 8)}` : ""}
                        </p>
                        <p className="mt-0.5 text-xs [color:var(--air-text-muted)]">
                          {new Date(l.created_at).toLocaleString("ru-RU")}
                        </p>
                        {(l.details as any)?.messagePreview && (
                          <p className="mt-1 text-xs [color:var(--air-text-muted)]">
                            {(l.details as any).messagePreview}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-xs [color:var(--air-text-muted)]">
                          Админ: @{l.admin_username ?? "—"}
                        </p>
                        <p className="text-xs [color:var(--air-text-muted)]">
                          Цель: @{l.target_username ?? "—"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
