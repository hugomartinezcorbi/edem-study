import { createClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notifications";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { postId, voteType } = await request.json();
  if (!["up", "down"].includes(voteType)) return NextResponse.json({ error: "Voto inválido" }, { status: 400 });

  const { data: existing } = await supabase
    .from("post_votes")
    .select("*")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing && existing.vote_type === voteType) {
    await supabase.from("post_votes").delete().eq("id", existing.id);
    return NextResponse.json({ myVote: null });
  }

  if (existing) {
    await supabase.from("post_votes").delete().eq("id", existing.id);
  }
  await supabase.from("post_votes").insert({ post_id: postId, user_id: user.id, vote_type: voteType });

  if (voteType === "up") {
    const { data: post } = await supabase.from("posts").select("user_id, title, community_subject_id").eq("id", postId).single();
    if (post && post.user_id !== user.id) {
      await notify(supabase, {
        userId: post.user_id,
        type: "upvote",
        title: "Tu publicación recibió un voto",
        body: post.title,
        link: `/community/${post.community_subject_id}/forum/${postId}`,
      });
    }
  }

  return NextResponse.json({ myVote: voteType });
}
