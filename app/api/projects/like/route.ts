import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { applicationId } = await request.json();

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
