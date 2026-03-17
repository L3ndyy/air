"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { MessageCircle } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      const message =
        err.message === "Invalid login credentials"
          ? "Неверный email или пароль. Проверьте данные или зарегистрируйтесь."
          : err.message;
      setError(message);
      return;
    }
    router.push("/chat");
    router.refresh();
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
          <Input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
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
