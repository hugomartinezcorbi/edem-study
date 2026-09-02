import { createClient } from "@/lib/supabase/server";
import { getUserModerationStatus, moderateAndLog } from "@/lib/moderation";
import { NextResponse } from "next/server";

export const maxDuration = 30;

const CATEGORIES = ["startup", "app", "proyecto", "investigacion", "otro"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { title, tagline, description, category, lookingFor } = await request.json();
  if (!title?.trim() || !tagline?.trim() || !description?.trim()) {
    return NextResponse.json({ error: "Faltan campos obligatorios" }, { status: 400 });
  }

  const status = await getUserModerationStatus(supabase, user.id);
  if (status.banned) return NextResponse.json({ error: "Tu cuenta no puede publicar" }, { status: 403 });

  const { visible, aiDecision } = await moderateAndLog(supabase, {
    contentType: "project",
    contentId: crypto.randomUUID(),
    userId: user.id,
    communitySubjectId: null,
    content: `${title}\n\n${tagline}\n\n${description}`,
    communityName: "Proyectos",
    forceReview: status.muted,
  });
  const moderationStatus = aiDecision === "auto_rejected" ? "rejected" : visible ? "approved" : "pending";

  const { data: project, error } = await supabase
    .from("projects")
    .insert({
      creator_id: user.id,
      title: title.trim(),
      tagline: tagline.trim(),
      description,
      category: CATEGORIES.includes(category) ? category : "proyecto",
      looking_for: Array.isArray(lookingFor) ? lookingFor.filter((r: unknown) => typeof r === "string" && r.trim()) : [],
      moderation_status: moderationStatus,
    })
    .select("*, creator:user_profiles(*)")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ project, moderationStatus });
}
