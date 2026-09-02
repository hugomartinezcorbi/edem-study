import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { applicationId } = await request.json();

  const { data: application } = await supabase
    .from("project_applications")
    .select("applicant_id")
    .eq("id", applicationId)
    .maybeSingle();
  if (!application) return NextResponse.json({ error: "Solicitud no encontrada" }, { status: 404 });
  if (application.applicant_id === user.id) {
    return NextResponse.json({ error: "No puedes valorar tu propia propuesta" }, { status: 400 });
  }

  const { data: existing } = await supabase
    .from("project_application_likes")
    .select("id")
    .eq("application_id", applicationId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("project_application_likes").delete().eq("id", existing.id);
    return NextResponse.json({ liked: false });
  }

  await supabase.from("project_application_likes").insert({ application_id: applicationId, user_id: user.id });
  return NextResponse.json({ liked: true });
}
