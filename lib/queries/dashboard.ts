import type { SupabaseClient } from "@supabase/supabase-js";
import type { Subject } from "@/lib/types";

export interface SubjectCardData extends Subject {
  totalConcepts: number;
  masteredConcepts: number;
  documentsCount: number;
  lastStudied: string | null;
}

export interface DashboardData {
  subjects: SubjectCardData[];
  dueTodayCount: number;
  streakDays: number;
  weekMinutes: number;
  weekNewConcepts: number;
  globalAccuracy: number | null;
  strongestSubject: string | null;
  weakestSubject: string | null;
}

export async function getDashboardData(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any, any, any>,
  userId: string
): Promise<DashboardData> {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: subjects },
    { data: concepts },
    { data: documents },
    { data: sessions },
    { count: dueTodayCount },
  ] = await Promise.all([
    supabase.from("subjects").select("*").eq("user_id", userId).order("semester").order("created_at"),
    supabase.from("concepts").select("id, subject_id, mastery_level, created_at"),
    supabase.from("documents").select("id, subject_id").eq("user_id", userId),
    supabase
      .from("study_sessions")
      .select("id, subject_id, started_at, duration_minutes")
      .eq("user_id", userId)
      .order("started_at", { ascending: false }),
    supabase
      .from("spaced_repetition")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .lte("next_review", today),
  ]);

  const sessionIds = new Set((sessions ?? []).map((s) => s.id));
  const { data: weekAnswers } = sessionIds.size
    ? await supabase
        .from("answers")
        .select("is_correct, answered_at, session_id")
        .gte("answered_at", weekAgo)
        .in("session_id", [...sessionIds])
    : { data: [] as { is_correct: boolean; answered_at: string; session_id: string }[] };

  const subjectList: Subject[] = subjects ?? [];

  const conceptsBySubject = new Map<string, { total: number; mastered: number }>();
  for (const c of concepts ?? []) {
    const entry = conceptsBySubject.get(c.subject_id) ?? { total: 0, mastered: 0 };
    entry.total += 1;
    if (c.mastery_level >= 0.8) entry.mastered += 1;
    conceptsBySubject.set(c.subject_id, entry);
  }

  const docsBySubject = new Map<string, number>();
  for (const d of documents ?? []) {
    docsBySubject.set(d.subject_id, (docsBySubject.get(d.subject_id) ?? 0) + 1);
  }

  const lastStudiedBySubject = new Map<string, string>();
  for (const s of sessions ?? []) {
    if (s.subject_id && !lastStudiedBySubject.has(s.subject_id)) {
      lastStudiedBySubject.set(s.subject_id, s.started_at);
    }
  }

  const subjectCards: SubjectCardData[] = subjectList.map((s) => {
    const conceptStats = conceptsBySubject.get(s.id) ?? { total: 0, mastered: 0 };
    return {
      ...s,
      totalConcepts: conceptStats.total,
      masteredConcepts: conceptStats.mastered,
      documentsCount: docsBySubject.get(s.id) ?? 0,
      lastStudied: lastStudiedBySubject.get(s.id) ?? null,
    };
  });

  // Study streak: consecutive days (including today or yesterday) with at least one session.
  const studyDays = new Set((sessions ?? []).map((s) => s.started_at.slice(0, 10)));
  let streakDays = 0;
  const cursor = new Date();
  if (!studyDays.has(cursor.toISOString().slice(0, 10))) cursor.setDate(cursor.getDate() - 1);
  while (studyDays.has(cursor.toISOString().slice(0, 10))) {
    streakDays += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  const weekMinutes = (sessions ?? [])
    .filter((s) => s.started_at >= weekAgo)
    .reduce((sum, s) => sum + (s.duration_minutes ?? 0), 0);

  const weekNewConcepts = (concepts ?? []).filter((c) => c.created_at >= weekAgo).length;

  const answers = weekAnswers ?? [];
  const globalAccuracy = answers.length
    ? answers.filter((a: { is_correct: boolean }) => a.is_correct).length / answers.length
    : null;

  let strongestSubject: string | null = null;
  let weakestSubject: string | null = null;
  let bestRatio = -1;
  let worstRatio = 2;
  for (const s of subjectCards) {
    if (s.totalConcepts === 0) continue;
    const ratio = s.masteredConcepts / s.totalConcepts;
    if (ratio > bestRatio) {
      bestRatio = ratio;
      strongestSubject = s.name;
    }
    if (ratio < worstRatio) {
      worstRatio = ratio;
      weakestSubject = s.name;
    }
  }

  return {
    subjects: subjectCards,
    dueTodayCount: dueTodayCount ?? 0,
    streakDays,
    weekMinutes,
    weekNewConcepts,
    globalAccuracy,
    strongestSubject,
    weakestSubject,
  };
}
