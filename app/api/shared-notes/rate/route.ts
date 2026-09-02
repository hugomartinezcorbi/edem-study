import { createClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notifications";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { noteId, rating, comment } = await request.json();
  if (!rating || rating < 1 || rating > 5) return NextResponse.json({ error: "Valoración inválida" }, { status: 400 });

  const { error } = await supabase
    .from("note_ratings")
    .upsert({ shared_note_id: noteId, user_id: user.id, rating, comment: comment ?? null }, { onConflict: "shared_note_id,user_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: note } = await supabase
    .from("shared_notes")
    .select("user_id, title, community_subject_id, rating_average")
    .eq("id", noteId)
    .single();
  if (note && note.user_id !== user.id) {
    await notify(supabase, {
      userId: note.user_id,
      type: "rating",
      title: `Nueva valoración en "${note.title}"`,
      body: `${rating} estrellas`,
      link: `/community/${note.community_subject_id}/notes/${noteId}`,
    });
  }

  return NextResponse.json({ ok: true });
}
