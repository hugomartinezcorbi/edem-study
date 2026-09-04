import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "not logged in" }, { status: 401 });

  const degree = user.user_metadata?.degree;
  const { error } = await supabase.rpc(degree === "IGE" ? "seed_ige_subjects" : "seed_edem_subjects", {
    p_user_id: user.id,
  });

  const { data: subjects } = await supabase.from("subjects").select("name, semester, ects, active").eq("user_id", user.id);
  return NextResponse.json({ degree, rpcError: error?.message ?? null, subjects });
}
