import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { sessionId, questionId, conceptId, phase, userAnswer, isCorrect, timeSpentSeconds } = await request.json();

  const { error: answerError } = await supabase.from("answers").insert({
    session_id: sessionId,
    question_id: questionId,
    concept_id: conceptId,
    phase,
    user_answer: userAnswer ?? null,
    is_correct: isCorrect,
    time_spent_seconds: timeSpentSeconds ?? null,
  });
  if (answerError) return NextResponse.json({ error: answerError.message }, { status: 500 });

  const { data: question } = await supabase
    .from("questions")
    .select("times_asked, times_correct")
    .eq("id", questionId)
    .single();
  if (question) {
    await supabase
      .from("questions")
      .update({
        times_asked: question.times_asked + 1,
        times_correct: question.times_correct + (isCorrect ? 1 : 0),
      })
      .eq("id", questionId);
  }

  return NextResponse.json({ ok: true });
}
