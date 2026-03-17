import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const tokenHash = typeof params?.token_hash === "string" ? params.token_hash : null;
  const type = typeof params?.type === "string" ? params.type : null;
  if (tokenHash && type) {
    redirect(`/auth/callback?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/chat");
  redirect("/login");
}
