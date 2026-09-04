import type { SupabaseClient } from "@supabase/supabase-js";
import type { ChatMessage } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

const PAGE_SIZE = 50;

// degree = null means the mixed channel (ADE + IGE together).
export async function getRecentMessages(db: DB, degree: "ADE" | "IGE" | null): Promise<ChatMessage[]> {
  let q = db
    .from("chat_messages")
    .select("*, author:user_profiles(*)")
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);
  q = degree ? q.eq("degree", degree) : q.is("degree", null);
  const { data } = await q;

  return ((data as ChatMessage[]) ?? []).reverse();
}

export async function getOlderMessages(
  db: DB,
  degree: "ADE" | "IGE" | null,
  beforeCreatedAt: string
): Promise<ChatMessage[]> {
  let q = db
    .from("chat_messages")
    .select("*, author:user_profiles(*)")
    .eq("is_deleted", false)
    .lt("created_at", beforeCreatedAt)
    .order("created_at", { ascending: false })
    .limit(PAGE_SIZE);
  q = degree ? q.eq("degree", degree) : q.is("degree", null);
  const { data } = await q;

  return ((data as ChatMessage[]) ?? []).reverse();
}
