import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const communityId = searchParams.get("communityId");
  const query = searchParams.get("q") ?? "";
  if (!communityId) return NextResponse.json({ error: "Falta communityId" }, { status: 400 });

  let q = supabase
    .from("chat_messages")
    .select("id, content, created_at, user_profiles(display_name)")
    .eq("community_subject_id", communityId)
    .eq("is_deleted", false)
    .eq("moderation_status", "approved")
    .order("created_at", { ascending: false })
    .limit(30);
  if (query.trim()) q = q.ilike("content", `%${query.trim()}%`);

  const { data } = await q;
  return NextResponse.json({ messages: data ?? [] });
}
