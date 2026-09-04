import { createClient } from "@/lib/supabase/server";
import { getOlderMessages } from "@/lib/queries/chat";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const before = searchParams.get("before");
  if (!before) return NextResponse.json({ error: "Falta el parámetro before" }, { status: 400 });

  const { data: profile } = await supabase.from("user_profiles").select("degree").eq("id", user.id).single();
  const degree = profile?.degree === "IGE" ? "IGE" : "ADE";

  const messages = await getOlderMessages(supabase, degree, before);
  return NextResponse.json({ messages });
}
