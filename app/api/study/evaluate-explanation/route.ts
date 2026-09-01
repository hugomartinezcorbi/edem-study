import { createClient } from "@/lib/supabase/server";
import { evaluateStudentExplanation } from "@/lib/claude";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { conceptId, studentExplanation } = await request.json();
  const { data: concept } = await supabase.from("concepts").select("definition").eq("id", conceptId).single();
  if (!concept) return NextResponse.json({ error: "Concepto no encontrado" }, { status: 404 });

  const result = await evaluateStudentExplanation({
    conceptDefinition: concept.definition,
    studentExplanation,
  });
  return NextResponse.json(result);
}
