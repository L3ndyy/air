"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { MessageCircle, Eye, EyeOff, Mail } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  useEffect(() => {
    if (searchParams.get("error") === "confirm") {
      setError("Ссылка для подтверждения устарела или уже использована. Войдите по email и паролю. Если только что зарегистрировались — нажмите «Отправить письмо снова» ниже.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setResendDone(false);
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) {
      setError("Введите email и пароль.");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: trimmedPassword,
      });
      if (err) {
        const msg = (err.message || "").toLowerCase();
        let message: string;
        if (
          err.status === 400 &&
          (msg.includes("email") && msg.includes("confirm") || msg.includes("not confirmed") || msg.includes("confirm your"))
        ) {
          message = "Почта ещё не подтверждена. Перейдите по ссылке из письма после регистрации или нажмите «Отправить письмо снова» ниже.";
        } else if (err.message === "Invalid login credentials" || (err.status === 400 && msg.includes("invalid"))) {
          message = "Неверный email или пароль. Проверьте данные или зарегистрируйтесь.";
        } else {
          message = err.message || "Ошибка входа.";
        }
        if (err.status === 400 && (msg.includes("request") || msg.includes("api"))) {
          message += " Если пароль верный — задайте временный пароль в админке (Пользователи → Временный пароль) и войдите с ним.";
        }
        setError(message);
        return;
      }
      router.push("/chat");
      router.refresh();
    } catch (e) {
      setError("Ошибка соединения. Проверьте настройки деплоя: NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendConfirmation() {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Введите email и нажмите «Отправить письмо снова».");
      return;
    }
    setResendLoading(true);
    setError(null);
    setResendDone(false);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.resend({
        type: "signup",
        email: trimmedEmail,
      });
      if (err) {
        setError(err.message === "Email rate limit exceeded" ? "Слишком частые запросы. Подождите несколько минут." : err.message);
        setResendLoading(false);
        return;
      }
      setResendDone(true);
    } catch {
      setError("Не удалось отправить письмо.");
    }
    setResendLoading(false);
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="text-center pb-1 pt-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 text-white shadow-lg shadow-blue-200/40 dark:shadow-purple-500/20">
          <MessageCircle className="h-7 w-7" />
        </div>
        <CardTitle className="text-2xl font-semibold tracking-tight">Air</CardTitle>
        <p className="mt-1 text-sm [color:var(--air-text-muted)]">Войдите в аккаунт</p>
      </CardHeader>
      <CardContent className="px-6 pb-8 pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"}
              placeholder="Пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 [color:var(--air-text-muted)] hover:bg-[var(--air-glass)] hover:[color:var(--air-text)] focus:outline-none focus:ring-2 focus:ring-[var(--air-accent)]"
              aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && (
            <p className="rounded-lg bg-red-500/15 dark:bg-red-500/20 px-3 py-2 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <Button type="submit" className="w-full" isLoading={loading}>
            Войти
          </Button>
          <p className="text-center text-sm [color:var(--air-text-muted)]">
            <Link href="/forgot-password" className="font-medium text-[var(--air-accent)] hover:opacity-90">
              Забыли пароль?
            </Link>
          </p>
          {(error?.includes("подтвержден") || error?.includes("подтверждения") || searchParams.get("error") === "confirm") && (
            <div className="rounded-xl border border-[var(--air-glass-border)] bg-[var(--air-input-bg)] p-3">
              <p className="mb-2 text-xs [color:var(--air-text-muted)]">
                Не пришло письмо или ссылка не открылась? Отправьте письмо подтверждения снова.
              </p>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full gap-2"
                onClick={handleResendConfirmation}
                disabled={resendLoading || !email.trim()}
                isLoading={resendLoading}
              >
                <Mail className="h-4 w-4" />
                {resendDone ? "Письмо отправлено — проверьте почту" : "Отправить письмо снова"}
              </Button>
            </div>
          )}
        </form>
        <p className="mt-5 text-center text-sm [color:var(--air-text-muted)]">
          Нет аккаунта?{" "}
          <Link href="/register" className="font-medium text-[var(--air-accent)] hover:opacity-90">
            Регистрация
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <Card className="overflow-hidden">
          <CardHeader className="text-center pb-1 pt-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 text-white shadow-lg">
              <MessageCircle className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl font-semibold tracking-tight">Air</CardTitle>
            <p className="mt-1 text-sm [color:var(--air-text-muted)]">Войдите в аккаунт</p>
          </CardHeader>
          <CardContent className="px-6 pb-8 pt-4">
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--air-accent)] border-t-transparent" />
            </div>
          </CardContent>
        </Card>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
