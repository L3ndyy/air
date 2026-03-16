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
