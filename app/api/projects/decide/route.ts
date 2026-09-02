import { createClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notifications";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { applicationId, decision } = await request.json();
  if (!["accepted", "rejected"].includes(decision)) {
    return NextResponse.json({ error: "Decisión inválida" }, { status: 400 });
  }

  const { data: application } = await supabase
    .from("project_applications")
    .select("id, applicant_id, status, project:projects(id, title, creator_id)")
    .eq("id", applicationId)
    .maybeSingle();
  if (!application) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });

  const project = application.project as unknown as { id: string; title: string; creator_id: string };
  if (project.creator_id !== user.id) return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  if (application.status !== "pending") return NextResponse.json({ error: "Esta solicitud ya fue resuelta" }, { status: 400 });

  const { error } = await supabase.from("project_applications").update({ status: decision }).eq("id", applicationId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await notify(supabase, {
    userId: application.applicant_id,
    type: "project_decision",
    title: decision === "accepted" ? "¡Te han aceptado en el proyecto!" : "Solicitud no aceptada",
    body: project.title,
    link: `/projects/${project.id}`,
  });

  return NextResponse.json({ status: decision });
}
