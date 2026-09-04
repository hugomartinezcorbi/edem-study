import { requireAdmin } from "@/lib/admin";
import { notifyAsService } from "@/lib/notifications";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await requireAdmin();
  if (!supabase) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const { requestId, reply, done } = await request.json();
  if (!requestId) return NextResponse.json({ error: "Falta la petición" }, { status: 400 });

  const { data: updated, error } = await supabase
    .from("requests")
    .update({
      admin_reply: typeof reply === "string" && reply.trim() ? reply.trim() : null,
      status: done ? "done" : "open",
      resolved_at: done ? new Date().toISOString() : null,
    })
    .eq("id", requestId)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  if (updated.admin_reply) {
    await notifyAsService(supabase, {
      userId: updated.user_id,
      type: "request_reply",
      title: "Respuesta a tu petición",
      body: updated.admin_reply.slice(0, 140),
      link: "/requests",
    });
  }

  return NextResponse.json({ request: updated });
}
