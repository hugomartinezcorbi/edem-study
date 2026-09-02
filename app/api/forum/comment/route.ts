import { createClient } from "@/lib/supabase/server";
import { getUserModerationStatus, moderateAndLog } from "@/lib/moderation";
import { notify, notifyMentions } from "@/lib/notifications";
import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { postId, content, replyToId } = await request.json();
  if (!content?.trim()) return NextResponse.json({ error: "Comentario vacío" }, { status: 400 });

  const { data: post } = await supabase
    .from("posts")
    .select("user_id, title, community_subject_id, community_subjects(name)")
    .eq("id", postId)
    .single();
  if (!post) return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });

  const communityName = (post.community_subjects as unknown as { name: string } | null)?.name ?? "";

  const status = await getUserModerationStatus(supabase, user.id);
  if (status.banned) return NextResponse.json({ error: "Tu cuenta no puede publicar" }, { status: 403 });

  const { visible, aiDecision } = await moderateAndLog(supabase, {
    contentType: "comment",
    contentId: crypto.randomUUID(),
    userId: user.id,
    communitySubjectId: post.community_subject_id,
    content,
    communityName,
    forceReview: status.muted,
  });
  const moderationStatus = aiDecision === "auto_rejected" ? "rejected" : visible ? "approved" : "pending";

  const { data: comment, error } = await supabase
    .from("post_comments")
    .insert({ post_id: postId, user_id: user.id, content, reply_to_id: replyToId ?? null, moderation_status: moderationStatus })
    .select("*, author:user_profiles(*)")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (moderationStatus === "approved") {
    const link = `/community/${post.community_subject_id}/forum/${postId}`;
    if (replyToId) {
      const { data: parent } = await supabase.from("post_comments").select("user_id").eq("id", replyToId).single();
      if (parent && parent.user_id !== user.id) {
        await notify(supabase, { userId: parent.user_id, type: "reply", title: "Te han respondido", body: content.slice(0, 120), link });
      }
    } else if (post.user_id !== user.id) {
      await notify(supabase, {
        userId: post.user_id,
        type: "comment",
        title: `Nuevo comentario en "${post.title}"`,
        body: content.slice(0, 120),
        link,
      });
    }
    await notifyMentions(supabase, { content, excludeUserId: user.id, title: `Mención en ${communityName}`, link });
  }

  return NextResponse.json({ comment, moderationStatus });
}
