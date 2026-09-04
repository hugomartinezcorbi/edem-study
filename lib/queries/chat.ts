import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatMessage } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

const PAGE_SIZE = 50;

export async function getRecentMessages(db: DB, degree: "ADE" | "IGE"): Promise<ChatMessage[]> {
  const { data } = await db
    .from("chat_messages")
    .select("*, author:user_profiles(*)")
    .eq("degree", degree)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  return ((data as ChatMessage[]) ?? []).reverse();
}

export async function getOlderMessages(db: DB, degree: "ADE" | "IGE", beforeCreatedAt: string): Promise<ChatMessage[]> {
  const { data } = await db
    .from("chat_messages")
    .select("*, author:user_profiles(*)")
    .eq("degree", degree)
    .eq("is_deleted", false)
    .lt("created_at", beforeCreatedAt)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);

  return ((data as ChatMessage[]) ?? []).reverse();
}
