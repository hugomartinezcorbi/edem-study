import { createClient } from "@/lib/supabase/server";
import { generateOrUpdateExamInsights } from "@/lib/claude";
import type { ExamInsightsContent } from "@/lib/types";
import { NextResponse } from "next/server";

export const maxDuration = 300;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { documentId } = await request.json();
  const { data: document } = await supabase
    .from("documents")
    .select("*")
    .eq("id", documentId)
    .eq("is_exam", true)
    .single();
  if (!document) return NextResponse.json({ error: "Examen no encontrado" }, { status: 404 });
  if (!document.extracted_text) {
    return NextResponse.json({ error: "El examen todavía no tiene texto extraído" }, { status: 400 });
  }

  const { data: subject } = await supabase.from("subjects").select("*").eq("id", document.subject_id).single();
  if (!subject) return NextResponse.json({ error: "Asignatura no encontrada" }, { status: 404 });

  const { data: existing } = await supabase
    .from("exam_insights")
    .select("*")
    .eq("subject_id", document.subject_id)
    .maybeSingle();

  const insights = await generateOrUpdateExamInsights({
    subjectName: subject.name,
    currentInsights: (existing?.content as ExamInsightsContent | undefined) ?? null,
    newExamText: document.extracted_text.slice(0, 60000),
  });

  const generatedFrom = [...new Set([...(existing?.generated_from ?? []), documentId])];

  const { data: saved, error: saveError } = await supabase
    .from("exam_insights")
    .upsert(
      {
        subject_id: document.subject_id,
        user_id: user.id,
        content: insights,
        version: (existing?.version ?? 0) + 1,
        last_updated: new Date().toISOString(),
        generated_from: generatedFrom,
      },
      { onConflict: "subject_id" }
    )
    .select("*")
    .single();

  if (saveError) return NextResponse.json({ error: saveError.message }, { status: 500 });

  await supabase.from("documents").update({ processed: true }).eq("id", documentId);

  return NextResponse.json({ insights: saved });
}
