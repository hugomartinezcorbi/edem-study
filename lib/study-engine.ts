import type { SupabaseClient } from "@supabase/supabase-js";
import { generateQuestionsForConcept } from "@/lib/claude";
import type { Concept, Question } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

export type StudyMode = "today" | "subject" | "quick";

export async function selectConceptsForSession(
  db: DB,
  userId: string,
  opts: { mode: StudyMode; subjectId?: string; topicId?: string; count: number }
): Promise<Concept[]> {
  if (opts.mode === "subject" && opts.subjectId) {
    let query = db.from("concepts").select("*").eq("subject_id", opts.subjectId);
    if (opts.topicId) query = query.eq("topic_id", opts.topicId);
    const { data } = await query.order("mastery_level", { ascending: true }).limit(opts.count);
    return (data as Concept[]) ?? [];
  }

  if (opts.mode === "today") {
    const today = new Date().toISOString().slice(0, 10);
    const { data: due } = await db
      .from("spaced_repetition")
      .select("concept_id, next_review")
      .eq("user_id", userId)
      .lte("next_review", today)
      .order("next_review", { ascending: true })
      .limit(opts.count);

    const ids = (due ?? []).map((d) => d.concept_id);
    if (ids.length === 0) return [];
    const { data: concepts } = await db.from("concepts").select("*").in("id", ids);
    const order = new Map(ids.map((id, i) => [id, i]));
    return ((concepts as Concept[]) ?? []).sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
  }

  // quick: random-ish sample across all subjects the user owns
  const { data } = await db.from("concepts").select("*").limit(200);
  const pool = (data as Concept[]) ?? [];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, opts.count);
}

export async function ensureSpacedRepetitionRows(db: DB, userId: string, conceptIds: string[]) {
  if (conceptIds.length === 0) return;
  const { data: existing } = await db
    .from("spaced_repetition")
    .select("concept_id")
    .eq("user_id", userId)
    .in("concept_id", conceptIds);
  const existingIds = new Set((existing ?? []).map((e) => e.concept_id));
  const missing = conceptIds.filter((id) => !existingIds.has(id));
  if (missing.length === 0) return;
  await db.from("spaced_repetition").insert(
    missing.map((concept_id) => ({
      user_id: userId,
      concept_id,
      ease_factor: 2.5,
      interval_days: 1,
      repetitions: 0,
      next_review: new Date().toISOString().slice(0, 10),
    }))
  );
}

/** Returns `count` questions for a concept, generating & persisting new ones via Claude if the bank is short. */
export async function ensureQuestionsForConcept(
  db: DB,
  concept: Concept,
  opts: { count: number; excludeIds?: string[]; examStyleNotes?: string }
): Promise<Question[]> {
  let query = db.from("questions").select("*").eq("concept_id", concept.id);
  if (opts.excludeIds?.length) query = query.not("id", "in", `(${opts.excludeIds.join(",")})`);
  const { data: existing } = await query.limit(opts.count);
  const bank = (existing as Question[]) ?? [];

  if (bank.length >= opts.count) return bank.slice(0, opts.count);

  const needed = opts.count - bank.length;
  const generated = await generateQuestionsForConcept({
    conceptTitle: concept.title,
    conceptDefinition: concept.definition,
    keyPoints: concept.key_points,
    examples: concept.examples,
    count: needed,
    examStyleNotes: opts.examStyleNotes,
  });

  const { data: inserted } = await db
    .from("questions")
    .insert(
      generated.map((q) => ({
        concept_id: concept.id,
        subject_id: concept.subject_id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        correct_answer: q.correct_answer,
        explanation: q.explanation,
        difficulty: q.difficulty,
      }))
    )
    .select("*");

  return [...bank, ...((inserted as Question[]) ?? [])];
}
