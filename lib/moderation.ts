import type { SupabaseClient } from "@supabase/supabase-js";
import { moderateContent } from "@/lib/claude";
import type { AiDecision, ModerationContentType } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

const DEFAULT_APPROVE_THRESHOLD = 0.85;
const DEFAULT_REJECT_THRESHOLD = 0.5;

export interface ModerationConfig {
  approveThreshold: number;
  rejectThreshold: number;
  blockedKeywords: string[];
  flaggedKeywords: string[];
}

export async function getModerationConfig(db: DB): Promise<ModerationConfig> {
  const { data: rules } = await db.from("moderation_rules").select("*").eq("is_active", true);

  let approveThreshold = DEFAULT_APPROVE_THRESHOLD;
  let rejectThreshold = DEFAULT_REJECT_THRESHOLD;
  const blockedKeywords: string[] = [];
  const flaggedKeywords: string[] = [];

  for (const rule of rules ?? []) {
    const condition = rule.condition ?? {};
    if (rule.rule_type === "auto_approve" && typeof condition.min_ai_score === "number") {
      approveThreshold = condition.min_ai_score;
    } else if (rule.rule_type === "auto_reject" && typeof condition.max_ai_score === "number") {
      rejectThreshold = condition.max_ai_score;
    } else if (rule.rule_type === "keyword_block" && typeof condition.keyword === "string") {
      blockedKeywords.push(condition.keyword.toLowerCase());
    } else if (rule.rule_type === "keyword_flag" && typeof condition.keyword === "string") {
      flaggedKeywords.push(condition.keyword.toLowerCase());
    }
  }

  return { approveThreshold, rejectThreshold, blockedKeywords, flaggedKeywords };
}

export interface ModerationResult {
  visible: boolean; // whether the content should be publicly visible right now
  aiDecision: AiDecision;
}

export interface UserModerationStatus {
  banned: boolean;
  muted: boolean;
}

export async function getUserModerationStatus(db: DB, userId: string): Promise<UserModerationStatus> {
  const { data } = await db.from("user_profiles").select("is_banned, is_muted").eq("id", userId).single();
  return { banned: data?.is_banned ?? false, muted: data?.is_muted ?? false };
}

/**
 * Runs a piece of user-submitted content through Claude moderation (plus
 * admin-configured keyword rules and thresholds), logs the verdict to
 * moderation_queue, and returns whether it should be visible now. The admin
 * can always override later from /admin.
 */
export async function moderateAndLog(
  db: DB,
  params: {
    contentType: ModerationContentType;
    contentId: string;
    userId: string;
    communitySubjectId: string | null;
    content: string;
    communityName: string;
    forceReview?: boolean;
  }
): Promise<ModerationResult> {
  const config = await getModerationConfig(db);
  const lowerContent = params.content.toLowerCase();

  const hitBlocked = config.blockedKeywords.find((k) => lowerContent.includes(k));
  if (hitBlocked) {
    const { error: blockLogError } = await db.from("moderation_queue").insert({
      content_type: params.contentType,
      content_id: params.contentId,
      user_id: params.userId,
      community_subject_id: params.communitySubjectId,
      content_preview: params.content.slice(0, 300),
      ai_decision: "auto_rejected",
      ai_reason: `Contiene la palabra bloqueada "${hitBlocked}"`,
      ai_score: 0,
    });
    if (blockLogError) console.error("moderation_queue insert failed:", blockLogError.message);
    return { visible: false, aiDecision: "auto_rejected" };
  }

  let verdict;
  try {
    verdict = await moderateContent({
      content: params.content,
      contentType: params.contentType,
      communityName: params.communityName,
    });
  } catch {
    // If moderation itself fails, default to manual review rather than blocking the user or auto-publishing.
    verdict = { score: 0.6, decision: "review" as const, reason: "No se pudo analizar automáticamente.", flags: [] };
  }

  const hitFlagged = config.flaggedKeywords.find((k) => lowerContent.includes(k));

  const aiDecision: AiDecision = hitFlagged || params.forceReview
    ? "needs_review"
    : verdict.score >= config.approveThreshold && verdict.decision === "approve"
      ? "auto_approved"
      : verdict.score < config.rejectThreshold || verdict.decision === "reject"
        ? "auto_rejected"
        : "needs_review";

  const { error: logError } = await db.from("moderation_queue").insert({
    content_type: params.contentType,
    content_id: params.contentId,
    user_id: params.userId,
    community_subject_id: params.communitySubjectId,
    content_preview: params.content.slice(0, 300),
    ai_decision: aiDecision,
    ai_reason: hitFlagged
      ? `Contiene la palabra marcada "${hitFlagged}". ${verdict.reason}`
      : params.forceReview
        ? `Usuario silenciado, revisión manual forzada. ${verdict.reason}`
        : verdict.reason,
    ai_score: verdict.score,
  });
  if (logError) console.error("moderation_queue insert failed:", logError.message);

  return { visible: aiDecision === "auto_approved", aiDecision };
}

const TABLE_BY_TYPE: Record<ModerationContentType, string> = {
  chat_message: "chat_messages",
  post: "posts",
  comment: "post_comments",
  shared_note: "shared_notes",
};

/** Applies the moderation_status column on the underlying content row to match an admin's decision. */
export async function applyModerationStatus(db: DB, contentType: ModerationContentType, contentId: string, approved: boolean) {
  const table = TABLE_BY_TYPE[contentType];
  await db.from(table).update({ moderation_status: approved ? "approved" : "rejected" }).eq("id", contentId);
}
