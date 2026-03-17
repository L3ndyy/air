"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { MessageCircle, Eye, EyeOff } from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchParams.get("error") === "confirm") {
      setError("Ссылка для подтверждения устарела или уже использована. Войдите по email и паролю.");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) {
        let message =
          err.message === "Invalid login credentials"
            ? "Неверный email или пароль. Проверьте данные или зарегистрируйтесь."
            : err.message;
        if (err.message?.toLowerCase().includes("request") || err.message?.toLowerCase().includes("api") || err.status === 400) {
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

  return (
    <Card className="overflow-hidden border-gray-200/70 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
      <CardHeader className="text-center pb-1 pt-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 text-white shadow-lg shadow-blue-200/40">
          <MessageCircle className="h-7 w-7" />
        </div>
        <CardTitle className="text-2xl font-semibold tracking-tight">Air</CardTitle>
        <p className="mt-1 text-sm text-gray-500">Войдите в аккаунт</p>
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
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              aria-label={showPassword ? "Скрыть пароль" : "Показать пароль"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
          )}
          <Button type="submit" className="w-full" isLoading={loading}>
            Войти
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-gray-500">
          Нет аккаунта?{" "}
          <Link href="/register" className="font-medium text-blue-500 hover:text-blue-600">
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
        <Card className="overflow-hidden border-gray-200/70 shadow-[0_8px_30px_rgb(0,0,0,0.06)]">
          <CardHeader className="text-center pb-1 pt-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 text-white shadow-lg shadow-blue-200/40">
              <MessageCircle className="h-7 w-7" />
            </div>
            <CardTitle className="text-2xl font-semibold tracking-tight">Air</CardTitle>
            <p className="mt-1 text-sm text-gray-500">Войдите в аккаунт</p>
          </CardHeader>
          <CardContent className="px-6 pb-8 pt-4">
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            </div>
          </CardContent>
        </Card>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
