import { createClient } from "@/lib/supabase/server";
import { generateAlternativeExplanation, generatePersonalizedExplanation } from "@/lib/claude";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { conceptId, mode, questionText, correctAnswer, userWrongAnswer } = await request.json();

  const { data: concept } = await supabase.from("concepts").select("*").eq("id", conceptId).single();
  if (!concept) return NextResponse.json({ error: "Concepto no encontrado" }, { status: 404 });

  if (mode === "alternative") {
    const result = await generateAlternativeExplanation({
      conceptTitle: concept.title,
      conceptDefinition: concept.definition,
    });
    return NextResponse.json(result);
  }

  const result = await generatePersonalizedExplanation({
    conceptTitle: concept.title,
    conceptDefinition: concept.definition,
    questionText: questionText ?? "",
    correctAnswer: correctAnswer ?? "",
    userWrongAnswer: userWrongAnswer ?? "",
  });
  return NextResponse.json(result);
}
