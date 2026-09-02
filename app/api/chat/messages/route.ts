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
  const communityId = searchParams.get("communityId");
  const before = searchParams.get("before");
  if (!communityId || !before) return NextResponse.json({ error: "Faltan parámetros" }, { status: 400 });

  const messages = await getOlderMessages(supabase, communityId, before);
  return NextResponse.json({ messages });
}
