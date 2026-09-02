import { createClient } from "@/lib/supabase/server";
import { moderateAndLog } from "@/lib/moderation";
import { notify, notifyMentions } from "@/lib/notifications";
import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { communityId, content, replyToId, fileUrl, fileName, messageType } = await request.json();
  if (!content?.trim() && !fileUrl) return NextResponse.json({ error: "Mensaje vacío" }, { status: 400 });

  const [{ data: membership }, { data: community }] = await Promise.all([
    supabase
      .from("community_memberships")
      .select("id")
      .eq("community_subject_id", communityId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("community_subjects").select("name").eq("id", communityId).single(),
  ]);
  if (!membership) return NextResponse.json({ error: "Únete a la comunidad para escribir" }, { status: 403 });

  const { visible, aiDecision } = await moderateAndLog(supabase, {
    contentType: "chat_message",
    contentId: crypto.randomUUID(),
    userId: user.id,
    communitySubjectId: communityId,
    content: content ?? fileName ?? "archivo adjunto",
    communityName: community?.name ?? "",
  });
  const moderationStatus = aiDecision === "auto_rejected" ? "rejected" : visible ? "approved" : "pending";

  const { data: message, error } = await supabase
    .from("chat_messages")
    .insert({
      community_subject_id: communityId,
      user_id: user.id,
      content: content ?? "",
      message_type: messageType ?? "text",
      file_url: fileUrl ?? null,
      file_name: fileName ?? null,
      reply_to_id: replyToId ?? null,
      moderation_status: moderationStatus,
    })
    .select("*, author:user_profiles(*)")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (moderationStatus === "approved") {
    await notifyMentions(supabase, {
      content,
      excludeUserId: user.id,
      title: `Mención en #${community?.name}`,
      link: `/community/${communityId}/chat`,
    });

    if (replyToId) {
      const { data: original } = await supabase.from("chat_messages").select("user_id").eq("id", replyToId).single();
      if (original && original.user_id !== user.id) {
        await notify(supabase, {
          userId: original.user_id,
          type: "reply",
          title: "Te han respondido en el chat",
          body: content?.slice(0, 120) ?? "",
          link: `/community/${communityId}/chat`,
        });
      }
    }
  }

  return NextResponse.json({ message, moderationStatus });
}
