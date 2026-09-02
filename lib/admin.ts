import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export function isAdminId(userId: string | undefined | null): boolean {
  return !!userId && !!process.env.ADMIN_USER_ID && userId === process.env.ADMIN_USER_ID;
}

/** Verifies the current session belongs to the admin and returns a service-role client for admin-only tables. */
export async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAdminId(user.id)) return null;
  return await createServiceRoleClient();
}
