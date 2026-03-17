import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY должны быть заданы. Добавьте их в настройках проекта на платформе деплоя (ONREZA, Vercel и т.д.) и пересоберите проект. См. README и DEPLOY.md."
    );
  }
  return createBrowserClient(url, key);
}
