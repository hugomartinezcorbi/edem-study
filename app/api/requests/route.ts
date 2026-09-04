import { createClient } from "@/lib/supabase/server";
import { notify } from "@/lib/notifications";
import type { RequestCategory } from "@/lib/types";
import { NextResponse } from "next/server";

const CATEGORIES: RequestCategory[] = ["sugerencia", "error", "ayuda", "otro"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { category, message } = await request.json();
  const text = typeof message === "string" ? message.trim() : "";
  if (!text) return NextResponse.json({ error: "Escribe tu petición" }, { status: 400 });
  if (text.length > 2000) return NextResponse.json({ error: "La petición es demasiado larga" }, { status: 400 });

  const { data: created, error } = await supabase
    .from("requests")
    .insert({
      user_id: user.id,
      category: CATEGORIES.includes(category) ? category : "sugerencia",
      message: text,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await notify(supabase, {
    userId: process.env.ADMIN_USER_ID ?? "",
    type: "request",
    title: "Nueva petición",
    body: text.slice(0, 140),
    link: "/admin/requests",
  });

  return NextResponse.json({ request: created });
}
