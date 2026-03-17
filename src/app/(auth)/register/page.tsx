"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, Input, Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { MessageCircle } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    if (!username || username.length < 3) {
      setUsernameAvailable(null);
      return;
    }
    const valid = /^[a-zA-Z0-9_]+$/.test(username);
    if (!valid) {
      setUsernameAvailable(false);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/users/check?username=${encodeURIComponent(username.trim().toLowerCase())}`,
          { cache: "no-store" }
        );
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        // Показываем "занят" только когда API явно вернул available: false
        setUsernameAvailable(
          typeof data.available === "boolean" ? data.available : null
        );
      } catch {
        if (!cancelled) setUsernameAvailable(null);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [username]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Пароли не совпадают");
      return;
    }
    if (password.length < 6) {
      setError("Пароль не менее 6 символов");
      return;
    }
    if (!username || username.length < 3) {
      setError("Username от 3 символов");
      return;
    }
    if (usernameAvailable === false) {
      setError("Этот username уже занят");
      return;
    }
    setLoading(true);
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: username.trim().toLowerCase(),
          full_name: fullName?.trim() || "",
        },
      },
    });
    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }
    if (!authData.user) {
      setLoading(false);
      setError("Ошибка регистрации");
      return;
    }
    setLoading(false);
    const needsConfirmation = !authData.session;
    if (needsConfirmation) {
      setSuccess(true);
      return;
    }
    router.push("/chat");
    router.refresh();
  }

  if (success) {
    return (
      <Card className="p-0 overflow-hidden shadow-air-md">
        <CardHeader className="text-center pb-2 pt-8">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 text-white">
            <MessageCircle className="h-7 w-7" />
          </div>
          <CardTitle className="text-xl">Проверьте почту</CardTitle>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            Мы отправили ссылку для подтверждения на <strong>{email}</strong>. Перейдите по ссылке из письма, затем войдите в аккаунт.
          </p>
        </CardHeader>
        <CardContent className="pb-8 pt-2">
          <Link href="/login">
            <Button className="w-full">Перейти к входу</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="p-0 overflow-hidden shadow-air-md">
      <CardHeader className="text-center pb-2 pt-6">
        <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-400 to-purple-500 text-white">
          <MessageCircle className="h-6 w-6" />
        </div>
        <CardTitle className="text-2xl">Air</CardTitle>
        <p className="text-sm text-gray-500">Создайте аккаунт</p>
      </CardHeader>
      <CardContent className="pt-2 pb-6">
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
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            minLength={3}
            autoComplete="username"
            error={
              usernameAvailable === false
                ? "Username занят"
                : undefined
            }
          />
          <Input
            type="text"
            placeholder="Имя (необязательно)"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            autoComplete="name"
          />
          <Input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            autoComplete="new-password"
          />
          <Input
            type="password"
            placeholder="Повторите пароль"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <Button type="submit" className="w-full" isLoading={loading}>
            Зарегистрироваться
          </Button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-500">
          Уже есть аккаунт?{" "}
          <Link href="/login" className="font-medium text-blue-500 hover:text-blue-600">
            Войти
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

