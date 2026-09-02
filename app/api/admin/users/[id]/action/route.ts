import { requireAdmin } from "@/lib/admin";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await requireAdmin();
  if (!supabase) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { action } = await request.json();

  if (action === "mute") await supabase.from("user_profiles").update({ is_muted: true }).eq("id", id);
  else if (action === "unmute") await supabase.from("user_profiles").update({ is_muted: false }).eq("id", id);
  else if (action === "ban") await supabase.from("user_profiles").update({ is_banned: true }).eq("id", id);
  else if (action === "unban") await supabase.from("user_profiles").update({ is_banned: false }).eq("id", id);
  else if (action === "verify") await supabase.from("user_profiles").update({ is_verified: true }).eq("id", id);
  else if (action === "delete") await supabase.auth.admin.deleteUser(id);
  else return NextResponse.json({ error: "Acción desconocida" }, { status: 400 });

  return NextResponse.json({ ok: true });
}
