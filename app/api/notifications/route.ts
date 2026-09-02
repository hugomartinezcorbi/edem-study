import { createClient } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/queries/notifications";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const notifications = await getNotifications(supabase, user.id);
  return NextResponse.json({ notifications });
}
