import type { SupabaseClient } from "@supabase/supabase-js";
import type { ModerationQueueItem } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

export async function getPendingQueue(
  db: DB,
  filters: { contentType?: string } = {}
): Promise<ModerationQueueItem[]> {
  let q = db
    .from("moderation_queue")
    .select("*, author:user_profiles(*)")
    .is("admin_decision", null)
    .eq("ai_decision", "needs_review")
    .order("created_at", { ascending: false });
  if (filters.contentType) q = q.eq("content_type", filters.contentType);

  const { data } = await q.limit(100);
  return (data as ModerationQueueItem[]) ?? [];
}

export async function getModerationHistory(
  db: DB,
  filters: { contentType?: string } = {}
): Promise<ModerationQueueItem[]> {
  let q = db
    .from("moderation_queue")
    .select("*, author:user_profiles(*)")
    .or("admin_decision.not.is.null,ai_decision.neq.needs_review")
    .order("created_at", { ascending: false });
  if (filters.contentType) q = q.eq("content_type", filters.contentType);

  const { data } = await q.limit(200);
  return (data as ModerationQueueItem[]) ?? [];
}

export interface ModerationStats {
  total: number;
  autoApproved: number;
  needsReview: number;
  autoRejected: number;
  pendingCount: number;
}

export async function getModerationStats(db: DB): Promise<ModerationStats> {
  const { data } = await db.from("moderation_queue").select("ai_decision, admin_decision");
  const rows = data ?? [];
  return {
    total: rows.length,
    autoApproved: rows.filter((r) => r.ai_decision === "auto_approved").length,
    needsReview: rows.filter((r) => r.ai_decision === "needs_review").length,
    autoRejected: rows.filter((r) => r.ai_decision === "auto_rejected").length,
    pendingCount: rows.filter((r) => r.ai_decision === "needs_review" && !r.admin_decision).length,
  };
}

export interface AdminUserRow {
  id: string;
  username: string;
  display_name: string;
  reputation_score: number;
  is_verified: boolean;
  is_banned: boolean;
  is_muted: boolean;
  created_at: string;
  rejectedCount: number;
}

export async function getAllUsersForAdmin(db: DB): Promise<AdminUserRow[]> {
  const { data: profiles } = await db
    .from("user_profiles")
    .select("*")
    .order("reputation_score", { ascending: false })
    .limit(200);
  const { data: rejections } = await db.from("moderation_queue").select("user_id").eq("ai_decision", "auto_rejected");

  const rejectedCounts = new Map<string, number>();
  for (const r of rejections ?? []) rejectedCounts.set(r.user_id, (rejectedCounts.get(r.user_id) ?? 0) + 1);

  return (profiles ?? []).map((p) => ({ ...p, rejectedCount: rejectedCounts.get(p.id) ?? 0 }));
}

export interface ModerationRuleRow {
  id: string;
  rule_type: string;
  condition: Record<string, unknown>;
  action: string;
  is_active: boolean;
  created_at: string;
}

export async function getModerationRules(db: DB): Promise<ModerationRuleRow[]> {
  const { data } = await db.from("moderation_rules").select("*").order("created_at", { ascending: false });
  return (data as ModerationRuleRow[]) ?? [];
}

export interface GeneralStats {
  totalUsers: number;
  activeToday: number;
  activeWeek: number;
  messagesTotal: number;
}

export async function getGeneralStats(db: DB): Promise<GeneralStats> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [{ count: totalUsers }, { count: activeToday }, { count: activeWeek }, { count: messagesTotal }] =
    await Promise.all([
      db.from("user_profiles").select("id", { count: "exact", head: true }),
      db.from("chat_messages").select("user_id", { count: "exact", head: true }).gte("created_at", todayStart.toISOString()),
      db.from("chat_messages").select("user_id", { count: "exact", head: true }).gte("created_at", weekAgo.toISOString()),
      db.from("chat_messages").select("id", { count: "exact", head: true }),
    ]);

  return {
    totalUsers: totalUsers ?? 0,
    activeToday: activeToday ?? 0,
    activeWeek: activeWeek ?? 0,
    messagesTotal: messagesTotal ?? 0,
  };
}
