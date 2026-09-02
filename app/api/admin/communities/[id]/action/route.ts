import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await requireAdmin();
  if (!supabase) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { action } = await request.json();

  if (action === "archive") await supabase.from("community_subjects").update({ is_archived: true }).eq("id", id);
  else if (action === "unarchive") await supabase.from("community_subjects").update({ is_archived: false }).eq("id", id);
  else if (action === "delete") await supabase.from("community_subjects").delete().eq("id", id);
  else return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });

  return NextResponse.json({ ok: true });
}
