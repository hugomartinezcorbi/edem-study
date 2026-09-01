import { createClient } from "@/lib/supabase/server";
import { masteryFromHistory, qualityFromOutcome, updateSpacedRepetition } from "@/lib/spaced-repetition";
import { NextResponse } from "next/server";

interface ConceptResult {
  conceptId: string;
  correctInFallar: boolean;
  correctInVolver: boolean; // irrelevant when correctInFallar is true
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { sessionId, results } = (await request.json()) as { sessionId: string; results: ConceptResult[] };

  const { data: session } = await supabase.from("study_sessions").select("*").eq("id", sessionId).single();
  if (!session) return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });

  const conceptIds = results.map((r) => r.conceptId);
  const { data: existingRows } = await supabase
    .from("spaced_repetition")
    .select("*")
    .eq("user_id", user.id)
    .in("concept_id", conceptIds);
  const existingByConceptId = new Map((existingRows ?? []).map((r) => [r.concept_id, r]));

  for (const result of results) {
    const quality = qualityFromOutcome(result.correctInFallar, result.correctInVolver);
    const current = existingByConceptId.get(result.conceptId) ?? {
      ease_factor: 2.5,
      interval_days: 1,
      repetitions: 0,
    };
    const updated = updateSpacedRepetition(current, quality);

    await supabase.from("spaced_repetition").upsert(
      {
        user_id: user.id,
        concept_id: result.conceptId,
        ...updated,
      },
      { onConflict: "user_id,concept_id" }
    );

    const { data: questions } = await supabase
      .from("questions")
      .select("times_asked, times_correct")
      .eq("concept_id", result.conceptId);
    const totals = (questions ?? []).reduce(
      (acc, q) => ({ asked: acc.asked + q.times_asked, correct: acc.correct + q.times_correct }),
      { asked: 0, correct: 0 }
    );
    await supabase
      .from("concepts")
      .update({
        mastery_level: masteryFromHistory(totals.correct, totals.asked),
        updated_at: new Date().toISOString(),
      })
      .eq("id", result.conceptId);
  }

  const totalQuestions = results.length + results.filter((r) => !r.correctInFallar).length;
  const correctAnswers =
    results.filter((r) => r.correctInFallar).length +
    results.filter((r) => !r.correctInFallar && r.correctInVolver).length;
  const durationMinutes = Math.max(1, Math.round((Date.now() - new Date(session.started_at).getTime()) / 60000));

  const { error: updateError } = await supabase
    .from("study_sessions")
    .update({
      ended_at: new Date().toISOString(),
      phase: "completed",
      total_questions: totalQuestions,
      correct_answers: correctAnswers,
      duration_minutes: durationMinutes,
      concepts_reviewed: conceptIds,
    })
    .eq("id", sessionId);
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({ ok: true, totalQuestions, correctAnswers, durationMinutes });
}
