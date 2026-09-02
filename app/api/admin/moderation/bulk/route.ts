import { requireAdmin } from "@/lib/admin";
import { applyModerationStatus } from "@/lib/moderation";
import type { ModerationContentType } from "@/lib/types";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await requireAdmin();
  if (!supabase) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { queueIds, decision } = await request.json();
  if (!Array.isArray(queueIds) || !["approved", "rejected"].includes(decision)) {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const { data: items } = await supabase.from("moderation_queue").select("*").in("id", queueIds);

  await supabase
    .from("moderation_queue")
    .update({ admin_decision: decision, decided_at: new Date().toISOString() })
    .in("id", queueIds);

  for (const item of items ?? []) {
    await applyModerationStatus(supabase, item.content_type as ModerationContentType, item.content_id, decision === "approved");
  }

  return NextResponse.json({ ok: true, count: items?.length ?? 0 });
}
