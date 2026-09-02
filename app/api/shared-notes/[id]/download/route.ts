import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: note } = await supabase.from("shared_notes").select("file_url").eq("id", id).single();
  if (!note) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const { data: signed, error } = await supabase.storage.from("shared-notes").createSignedUrl(note.file_url, 60 * 10);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.rpc("increment_note_downloads", { p_note_id: id });

  return NextResponse.json({ url: signed.signedUrl });
}
