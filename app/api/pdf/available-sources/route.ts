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
  if (!communityId) return NextResponse.json({ error: "Falta communityId" }, { status: 400 });

  const [{ data: sharedNotes }, { data: posts }] = await Promise.all([
    supabase
      .from("shared_notes")
      .select("id, title, rating_average, rating_count")
      .eq("community_subject_id", communityId)
      .order("rating_average", { ascending: false })
      .limit(20),
    supabase
      .from("posts")
      .select("id, title, post_type")
      .eq("community_subject_id", communityId)
      .in("post_type", ["apuntes", "recurso"])
      .order("upvotes", { ascending: false })
      .limit(20),
  ]);

  return NextResponse.json({ sharedNotes: sharedNotes ?? [], posts: posts ?? [] });
}
