import { createClient } from "@/lib/supabase/server";
import { getUserModerationStatus, moderateAndLog } from "@/lib/moderation";
import { notify } from "@/lib/notifications";
import { NextResponse } from "next/server";

export const maxDuration = 30;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { projectId, pitch } = await request.json();
  if (!pitch?.trim()) return NextResponse.json({ error: "Escribe tu propuesta" }, { status: 400 });

  const { data: project } = await supabase.from("projects").select("id, title, creator_id, status").eq("id", projectId).maybeSingle();
  if (!project) return NextResponse.json({ error: "Proyecto no encontrado" }, { status: 404 });
  if (project.status !== "open") return NextResponse.json({ error: "Este proyecto ya no acepta solicitudes" }, { status: 400 });
  if (project.creator_id === user.id) return NextResponse.json({ error: "No puedes solicitar unirte a tu propio proyecto" }, { status: 400 });

  const modStatus = await getUserModerationStatus(supabase, user.id);
  if (modStatus.banned) return NextResponse.json({ error: "Tu cuenta no puede enviar solicitudes" }, { status: 403 });

  const { visible, aiDecision } = await moderateAndLog(supabase, {
    contentType: "project_application",
    contentId: crypto.randomUUID(),
    userId: user.id,
    communitySubjectId: null,
    content: pitch,
    communityName: project.title,
    forceReview: modStatus.muted,
  });
  const moderationStatus = aiDecision === "auto_rejected" ? "rejected" : visible ? "approved" : "pending";

  const { data: application, error } = await supabase
    .from("project_applications")
    .insert({
      project_id: projectId,
      applicant_id: user.id,
      pitch: pitch.trim(),
      moderation_status: moderationStatus,
    })
    .select("*, applicant:user_profiles(*)")
    .single();
  if (error) {
    if (error.code === "23505") return NextResponse.json({ error: "Ya has enviado una solicitud a este proyecto" }, { status: 409 });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (moderationStatus === "approved") {
    await notify(supabase, {
      userId: project.creator_id,
      type: "project_application",
      title: "Nueva solicitud para tu proyecto",
      body: `${project.title}: alguien quiere unirse`,
      link: `/projects/${projectId}`,
    });
  }

  return NextResponse.json({ application, moderationStatus });
}
