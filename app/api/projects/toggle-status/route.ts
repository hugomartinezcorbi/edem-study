import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { projectId } = await request.json();

  const { data: project } = await supabase.from("projects").select("creator_id, status").eq("id", projectId).maybeSingle();
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  if (project.creator_id !== user.id) return NextResponse.json({ error: "No autorizado" }, { status: 403 });

  const nextStatus = project.status === "open" ? "closed" : "open";
  const { error } = await supabase.from("projects").update({ status: nextStatus }).eq("id", projectId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ status: nextStatus });
}
