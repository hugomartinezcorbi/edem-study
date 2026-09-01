import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { data: document } = await supabase.from("documents").select("file_url").eq("id", id).single();
  if (!document) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  await supabase.storage.from("documents").remove([document.file_url]);
  const { error } = await supabase.from("documents").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
