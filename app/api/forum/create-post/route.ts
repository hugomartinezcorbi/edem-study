import { createClient } from "@/lib/supabase/server";
import { moderateAndLog } from "@/lib/moderation";
import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { communityId, title, content, postType, attachments } = await request.json();
  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: "Falta título o contenido" }, { status: 400 });
  }

  const [{ data: membership }, { data: community }] = await Promise.all([
    supabase
      .from("community_memberships")
      .select("id")
      .eq("community_subject_id", communityId)
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("community_subjects").select("name").eq("id", communityId).single(),
  ]);
  if (!membership) return NextResponse.json({ error: "Únete a la comunidad para publicar" }, { status: 403 });

  const { visible, aiDecision } = await moderateAndLog(supabase, {
    contentType: "post",
    contentId: crypto.randomUUID(),
    userId: user.id,
    communitySubjectId: communityId,
    content: `${title}\n\n${content}`,
    communityName: community?.name ?? "",
  });
  const moderationStatus = aiDecision === "auto_rejected" ? "rejected" : visible ? "approved" : "pending";

  const { data: post, error } = await supabase
    .from("posts")
    .insert({
      community_subject_id: communityId,
      user_id: user.id,
      title: title.trim(),
      content,
      post_type: postType ?? "discusion",
      attachments: attachments ?? [],
      moderation_status: moderationStatus,
    })
    .select("*, author:user_profiles(*)")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ post, moderationStatus });
}
