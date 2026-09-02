import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

export interface OwnSubjectOption {
  id: string;
  name: string;
  hasNotes: boolean;
  notesId: string | null;
  documents: { id: string; filename: string }[];
}

export async function getOwnSourceOptions(db: DB, userId: string): Promise<OwnSubjectOption[]> {
  const [{ data: subjects }, { data: notes }, { data: documents }] = await Promise.all([
    db.from("subjects").select("id, name").eq("user_id", userId).order("name"),
    db.from("notes").select("id, subject_id"),
    db.from("documents").select("id, filename, subject_id").eq("user_id", userId).eq("is_exam", false),
  ]);

  const notesBySubject = new Map((notes ?? []).map((n) => [n.subject_id, n.id]));
  const docsBySubject = new Map<string, { id: string; filename: string }[]>();
  for (const doc of documents ?? []) {
    const list = docsBySubject.get(doc.subject_id) ?? [];
    list.push({ id: doc.id, filename: doc.filename });
    docsBySubject.set(doc.subject_id, list);
  }

  return (subjects ?? []).map((s) => ({
    id: s.id,
    name: s.name,
    hasNotes: notesBySubject.has(s.id),
    notesId: notesBySubject.get(s.id) ?? null,
    documents: docsBySubject.get(s.id) ?? [],
  }));
}
