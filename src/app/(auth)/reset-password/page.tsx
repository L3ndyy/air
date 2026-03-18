"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { MessageCircle, Lock } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data: { user } }) => {
      if (!user) router.replace("/login");
    });
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Пароль не менее 6 символов");
      return;
    }
    if (password !== confirm) {
      setError("Пароли не совпадают");
      return;
    }
    setLoading(true);
    try {
      const { error: err } = await createClient().auth.updateUser({ password });
      if (err) {
        setError(err.message);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.replace("/chat"), 1500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <Card className="w-full max-w-sm overflow-hidden">
        <CardHeader className="text-center pb-1 pt-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 text-white shadow-lg">
            <MessageCircle className="h-7 w-7" />
          </div>
          <CardTitle className="text-2xl font-semibold tracking-tight">Новый пароль</CardTitle>
          <p className="mt-1 text-sm [color:var(--air-text-muted)]">
            {success ? "Пароль изменён" : "Задайте новый пароль для входа"}
          </p>
        </CardHeader>
        <CardContent className="px-6 pb-8 pt-4">
          {success ? (
            <p className="text-center text-sm [color:var(--air-text)]">Перенаправление в чат…</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="password"
                placeholder="Новый пароль (от 6 символов)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
              />
              <Input
                type="password"
                placeholder="Повторите пароль"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
              <Button type="submit" className="w-full gap-2" isLoading={loading} disabled={loading}>
                <Lock className="h-4 w-4" />
                Сохранить пароль
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
