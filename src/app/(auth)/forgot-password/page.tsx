"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { MessageCircle, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Введите email");
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent("/reset-password")}`;
      const { error: err } = await supabase.auth.resetPasswordForEmail(trimmed, { redirectTo });
      if (err) {
        setError(err.message);
        return;
      }
      setSent(true);
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
          <CardTitle className="text-2xl font-semibold tracking-tight">Восстановление пароля</CardTitle>
          <p className="mt-1 text-sm [color:var(--air-text-muted)]">
            {sent ? "Письмо отправлено" : "Введите email вашего аккаунта"}
          </p>
        </CardHeader>
        <CardContent className="px-6 pb-8 pt-4">
          {sent ? (
            <div className="space-y-4">
              <p className="text-sm [color:var(--air-text)]">
                На {email} отправлена ссылка для сброса пароля. Перейдите по ней и задайте новый пароль.
              </p>
              <Link href="/login" className="block">
                <Button variant="secondary" className="w-full">Вернуться к входу</Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
              <Button type="submit" className="w-full" isLoading={loading} disabled={loading}>
                <Mail className="mr-2 h-4 w-4" />
                Отправить ссылку
              </Button>
            </form>
          )}
          <p className="mt-5 text-center text-sm [color:var(--air-text-muted)]">
            <Link href="/login" className="font-medium text-[var(--air-accent)] hover:opacity-90">
              Назад к входу
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
