import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await requireAdmin();
  if (!supabase) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { ruleType, condition, action } = await request.json();
  const { data, error } = await supabase
    .from("moderation_rules")
    .insert({ rule_type: ruleType, condition, action })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ rule: data });
}

export async function DELETE(request: Request) {
  const supabase = await requireAdmin();
  if (!supabase) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id } = await request.json();
  const { error } = await supabase.from("moderation_rules").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

export async function PATCH(request: Request) {
  const supabase = await requireAdmin();
  if (!supabase) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { id, isActive, condition } = await request.json();
  const update: Record<string, unknown> = {};
  if (typeof isActive === "boolean") update.is_active = isActive;
  if (condition) update.condition = condition;

  const { error } = await supabase.from("moderation_rules").update(update).eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
