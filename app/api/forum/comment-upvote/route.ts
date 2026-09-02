import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { commentId } = await request.json();
  const { data: comment } = await supabase.from("post_comments").select("upvotes").eq("id", commentId).single();
  if (!comment) return NextResponse.json({ error: "Comentario no encontrado" }, { status: 404 });

  const { error } = await supabase
    .from("post_comments")
    .update({ upvotes: comment.upvotes + 1 })
    .eq("id", commentId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
