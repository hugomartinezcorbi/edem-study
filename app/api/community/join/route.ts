import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { communityId } = await request.json();
  const { error } = await supabase
    .from("community_memberships")
    .insert({ user_id: user.id, community_subject_id: communityId });
  if (error && error.code !== "23505") return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
