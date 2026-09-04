import { createClient } from "@/lib/supabase/server";
import { getUserModerationStatus, moderateAndLog } from "@/lib/moderation";
import { notifyMentions } from "@/lib/notifications";
import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { content, fileUrl, fileName, messageType } = await request.json();
  if (!content?.trim() && !fileUrl) return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });

  const status = await getUserModerationStatus(supabase, user.id);
  if (status.banned) return NextResponse.json({ error: "Tu cuenta no puede publicar" }, { status: 403 });

  const { visible, aiDecision } = await moderateAndLog(supabase, {
    contentType: "chat_message",
    contentId: crypto.randomUUID(),
    userId: user.id,
    communitySubjectId: null,
    content: content ?? fileName ?? "archivo adjunto",
    communityName: "Chat",
    forceReview: status.muted,
  });
  const moderationStatus = aiDecision === "auto_rejected" ? "rejected" : visible ? "approved" : "pending";

  const { data: message, error } = await supabase
    .from("chat_messages")
    .insert({
      community_subject_id: null,
      user_id: user.id,
      content: content ?? "",
      message_type: messageType ?? "text",
      file_url: fileUrl ?? null,
      file_name: fileName ?? null,
      moderation_status: moderationStatus,
    })
    .select("*, author:user_profiles(*)")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (moderationStatus === "approved") {
    await notifyMentions(supabase, {
      content,
      excludeUserId: user.id,
      title: "Mención en el chat",
      link: "/chat",
    });
  }

  return NextResponse.json({ message, moderationStatus });
}
