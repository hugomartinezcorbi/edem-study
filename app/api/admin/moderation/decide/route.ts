import { requireAdmin } from "@/lib/admin";
import { applyModerationStatus } from "@/lib/moderation";
import type { ModerationContentType } from "@/lib/types";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await requireAdmin();
  if (!supabase) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { queueId, decision, notes } = await request.json();
  if (!["approved", "rejected"].includes(decision)) {
    return NextResponse.json({ error: "Decisión inválida" }, { status: 400 });
  }

  const { data: item } = await supabase.from("moderation_queue").select("*").eq("id", queueId).single();
  if (!item) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  await supabase
    .from("moderation_queue")
    .update({ admin_decision: decision, admin_notes: notes ?? null, decided_at: new Date().toISOString() })
    .eq("id", queueId);

  await applyModerationStatus(supabase, item.content_type as ModerationContentType, item.content_id, decision === "approved");

  return NextResponse.json({ ok: true });
}
