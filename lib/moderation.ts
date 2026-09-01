import type { SupabaseClient } from "@supabase/supabase-js";
import { moderateContent } from "@/lib/claude";
import type { AiDecision, ModerationContentType } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

const APPROVE_THRESHOLD = 0.85;
const REJECT_THRESHOLD = 0.5;

export interface ModerationResult {
  visible: boolean; // whether the content should be publicly visible right now
  aiDecision: AiDecision;
}

/**
 * Runs a piece of user-submitted content through Claude moderation, logs the
 * verdict to moderation_queue, and returns whether it should be visible now.
 * The admin can always override later from /admin.
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
  }
): Promise<ModerationResult> {
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

  const aiDecision: AiDecision =
    verdict.score >= APPROVE_THRESHOLD && verdict.decision === "approve"
      ? "auto_approved"
      : verdict.score < REJECT_THRESHOLD || verdict.decision === "reject"
        ? "auto_rejected"
        : "needs_review";

  await db.from("moderation_queue").insert({
    content_type: params.contentType,
    content_id: params.contentId,
    user_id: params.userId,
    community_subject_id: params.communitySubjectId,
    content_preview: params.content.slice(0, 300),
    ai_decision: aiDecision,
    ai_reason: verdict.reason,
    ai_score: verdict.score,
  });

  return { visible: aiDecision === "auto_approved", aiDecision };
}

const TABLE_BY_TYPE: Record<ModerationContentType, string> = {
  chat_message: "chat_messages",
  post: "posts",
  comment: "post_comments",
  shared_note: "shared_notes",
};

/** Applies the moderation_status column on the underlying content row to match the AI verdict. */
export async function applyModerationStatus(
  db: DB,
  contentType: ModerationContentType,
  contentId: string,
  visible: boolean,
  rejected: boolean
) {
  const table = TABLE_BY_TYPE[contentType];
  const status = rejected ? "rejected" : visible ? "approved" : "pending";
  await db.from(table).update({ moderation_status: status }).eq("id", contentId);
}
