import { createClient } from "@/lib/supabase/server";
import { ensureQuestionsForConcept } from "@/lib/study-engine";
import type { ExamInsightsContent } from "@/lib/types";
import { NextResponse } from "next/server";

export const maxDuration = 120;

/** Fetches a fresh question per concept, different from the ones already asked (used in the VOLVER phase). */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { conceptIds, excludeQuestionIds = [] } = await request.json();
  if (!Array.isArray(conceptIds) || conceptIds.length === 0) {
    return NextResponse.json({ error: "Faltan conceptos" }, { status: 400 });
  }

  const { data: concepts } = await supabase.from("concepts").select("*").in("id", conceptIds);
  if (!concepts || concepts.length === 0) return NextResponse.json({ error: "Conceptos no encontrados" }, { status: 404 });

  const subjectIds = [...new Set(concepts.map((c) => c.subject_id))];
  const { data: examInsightRows } = await supabase.from("exam_insights").select("subject_id, content").in("subject_id", subjectIds);
  const styleBySubject = new Map<string, string>();
  for (const row of examInsightRows ?? []) {
    const content = row.content as ExamInsightsContent;
    styleBySubject.set(row.subject_id, `${content.questionStyleNotes}\nDificultad: ${content.difficultyProfile}`);
  }

  const items = [];
  for (const concept of concepts) {
    // Ask for one extra beyond the excluded ones so there's always a fresh question available.
    const questions = await ensureQuestionsForConcept(supabase, concept, {
      count: excludeQuestionIds.length + 1,
      examStyleNotes: styleBySubject.get(concept.subject_id),
    });
    const fresh = questions.find((q) => !excludeQuestionIds.includes(q.id)) ?? questions[0];
    if (fresh) items.push({ concept, question: fresh });
  }

  return NextResponse.json({ items });
}
