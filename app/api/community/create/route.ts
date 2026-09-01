import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { name, university, degree, description } = await request.json();
  if (!name?.trim()) return NextResponse.json({ error: "Falta el nombre" }, { status: 400 });

  const { data: community, error } = await supabase
    .from("community_subjects")
    .insert({ name: name.trim(), university, degree, description, created_by: user.id })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("community_memberships").insert({
    user_id: user.id,
    community_subject_id: community.id,
    role: "admin",
  });

  return NextResponse.json({ community });
}
