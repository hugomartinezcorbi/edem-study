import { createClient } from "@/lib/supabase/server";
import { ensureQuestionsForConcept, selectConceptsForSession, type StudyMode } from "@/lib/study-engine";
import type { ExamInsightsContent } from "@/lib/types";
import { NextResponse } from "next/server";

export const maxDuration = 120;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const mode = (body.mode ?? "subject") as StudyMode;
  const subjectId: string | undefined = body.subjectId;
  const topicId: string | undefined = body.topicId;
  const count: number = Math.min(15, Math.max(5, body.count ?? 10));

  const concepts = await selectConceptsForSession(supabase, user.id, { mode, subjectId, topicId, count });
  if (concepts.length === 0) {
    return NextResponse.json({ error: "No hay conceptos disponibles para estudiar todavía. Sube material y genera apuntes primero." }, { status: 400 });
  }

  const subjectIds = [...new Set(concepts.map((c) => c.subject_id))];
  const { data: examInsightRows } = await supabase.from("exam_insights").select("subject_id, content").in("subject_id", subjectIds);
  const styleBySubject = new Map<string, string>();
  for (const row of examInsightRows ?? []) {
    const content = row.content as ExamInsightsContent;
    styleBySubject.set(row.subject_id, `${content.questionStyleNotes}\nDificultad: ${content.difficultyProfile}`);
  }

  const { data: session, error: sessionError } = await supabase
    .from("study_sessions")
    .insert({
      user_id: user.id,
      subject_id: mode === "subject" ? subjectId : null,
      phase: "fallar",
      concepts_reviewed: concepts.map((c) => c.id),
    })
    .select("*")
    .single();
  if (sessionError) return NextResponse.json({ error: sessionError.message }, { status: 500 });

  const items = [];
  for (const concept of concepts) {
    const questions = await ensureQuestionsForConcept(supabase, concept, {
      count: 1,
      examStyleNotes: styleBySubject.get(concept.subject_id),
    });
    if (questions[0]) items.push({ concept, question: questions[0] });
  }

  return NextResponse.json({ session, items });
}
