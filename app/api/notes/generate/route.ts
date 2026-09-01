import { createClient } from "@/lib/supabase/server";
import { generateOrUpdateNotes } from "@/lib/claude";
import { ensureQuestionsForConcept, ensureSpacedRepetitionRows } from "@/lib/study-engine";
import type { NotesContent } from "@/lib/types";
import { NextResponse } from "next/server";

export const maxDuration = 300;

const MAX_NEW_MATERIAL_CHARS = 120000;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { subjectId } = await request.json();
  const { data: subject } = await supabase.from("subjects").select("*").eq("id", subjectId).single();
  if (!subject) return NextResponse.json({ error: "Asignatura no encontrada" }, { status: 404 });

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("subject_id", subjectId)
    .eq("is_exam", false);

  const unprocessed = (documents ?? []).filter((d) => !d.processed && d.extracted_text);
  const processed = (documents ?? []).filter((d) => d.processed);

  if (unprocessed.length === 0) {
    return NextResponse.json({ error: "No hay documentos nuevos por procesar" }, { status: 400 });
  }

  const newDocumentText = unprocessed
    .map((d) => `--- ${d.filename} ---\n${d.extracted_text}`)
    .join("\n\n")
    .slice(0, MAX_NEW_MATERIAL_CHARS);

  const processedDocsSummary = processed.map((d) => `- ${d.filename}`).join("\n");

  const { data: existingNotes } = await supabase.from("notes").select("*").eq("subject_id", subjectId).maybeSingle();

  const { notes, newConcepts } = await generateOrUpdateNotes({
    subjectName: subject.name,
    currentNotes: (existingNotes?.content as NotesContent | undefined) ?? null,
    newDocumentText,
    processedDocsSummary,
  });

  const newDocIds = unprocessed.map((d) => d.id);
  const generatedFrom = [...new Set([...(existingNotes?.generated_from ?? []), ...newDocIds])];

  const { data: savedNotes, error: notesError } = await supabase
    .from("notes")
    .upsert(
      {
        subject_id: subjectId,
        user_id: user.id,
        content: notes,
        version: (existingNotes?.version ?? 0) + 1,
        last_updated: new Date().toISOString(),
        generated_from: generatedFrom,
      },
      { onConflict: "subject_id" }
    )
    .select("*")
    .single();

  if (notesError) return NextResponse.json({ error: notesError.message }, { status: 500 });

  let createdConcepts: { id: string; title: string }[] = [];
  if (newConcepts.length > 0) {
    const { data: inserted, error: conceptsError } = await supabase
      .from("concepts")
      .insert(
        newConcepts.map((c) => ({
          subject_id: subjectId,
          title: c.title,
          definition: c.definition,
          key_points: c.keyPoints,
          examples: c.examples,
          source_document_ids: newDocIds,
        }))
      )
      .select("id, title, definition, key_points, examples, subject_id, topic_id, mastery_level, source_document_ids, created_at, updated_at");

    if (conceptsError) return NextResponse.json({ error: conceptsError.message }, { status: 500 });
    createdConcepts = inserted ?? [];

    await ensureSpacedRepetitionRows(
      supabase,
      user.id,
      createdConcepts.map((c) => c.id)
    );

    for (const concept of inserted ?? []) {
      await ensureQuestionsForConcept(supabase, concept, { count: 3 });
    }
  }

  await supabase.from("documents").update({ processed: true }).in("id", newDocIds);

  return NextResponse.json({ notes: savedNotes, newConceptsCreated: createdConcepts.length });
}
