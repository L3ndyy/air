import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Check if the given email is in the admin list (ADMIN_EMAILS env, comma-separated).
 */
export function isAdminEmail(email: string | undefined): boolean {
  if (!email) return false;
  const list = process.env.ADMIN_EMAILS?.trim();
  if (!list) return false;
  const emails = list.split(",").map((e) => e.trim().toLowerCase());
  return emails.includes(email.toLowerCase());
}

const MAINTENANCE_KEY = "maintenance";

/** Get maintenance mode from app_settings (server-only, uses service role). */
export async function getMaintenance(): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("app_settings")
      .select("value")
      .eq("key", MAINTENANCE_KEY)
      .single();
    if (error || !data?.value) return false;
    return data.value === true;
  } catch {
    return false;
  }
}

/** Set maintenance mode (server-only, uses service role). */
export async function setMaintenance(value: boolean): Promise<void> {
  const admin = createAdminClient();
  await admin
    .from("app_settings")
    .upsert({ key: MAINTENANCE_KEY, value }, { onConflict: "key" });
}
