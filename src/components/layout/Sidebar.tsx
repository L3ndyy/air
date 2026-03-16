"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { MessageCircle, User, Plus } from "lucide-react";
import { Avatar } from "@/components/ui";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { Profile } from "@/types/database";

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const isProfileOpen = pathname === "/chat" && searchParams.get("panel") === "profile";
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(data ?? null);
    })();
  }, [supabase]);

  return (
    <aside className="flex w-72 shrink-0 flex-col border-r border-gray-200/60 bg-white/80 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-2 border-b border-gray-200/60 px-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 text-white">
          <MessageCircle className="h-5 w-5" />
        </div>
        <span className="font-semibold text-gray-800">Air</span>
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        <Link
          href="/chat?new=1"
          className="flex items-center gap-3 rounded-xl px-3 py-2 text-sm text-gray-600 hover:bg-gray-100/80"
        >
          <Plus className="h-5 w-5" />
          Новый чат
        </Link>
      </div>
      <div className="border-t border-gray-200/60 p-3">
        <Link
          href="/chat?panel=profile"
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
            isProfileOpen ? "bg-blue-50/80 text-gray-800" : "text-gray-600 hover:bg-gray-100/80"
          }`}
        >
          <Avatar
            src={profile?.avatar_url}
            fallback={profile?.full_name || profile?.username || "?"}
            size="sm"
          />
          <span className="min-w-0 truncate font-medium">
            {profile?.full_name || profile?.username || "Профиль"}
          </span>
          <User className="ml-auto h-4 w-4 shrink-0 opacity-60" />
        </Link>
      </div>
    </aside>
  );
}
