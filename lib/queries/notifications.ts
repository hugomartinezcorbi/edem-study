import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppNotification } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

export async function getNotifications(db: DB, userId: string, limit = 30): Promise<AppNotification[]> {
  const { data } = await db
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data as AppNotification[]) ?? [];
}

export async function getUnreadCount(db: DB, userId: string): Promise<number> {
  const { count } = await db
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false);
  return count ?? 0;
}
