import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { ExamList } from "@/components/exams/ExamList";
import { ExamInsightsPanel } from "@/components/exams/ExamInsightsPanel";
import type { ExamInsightsContent } from "@/lib/types";

export default async function ExamsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: subject }, { data: exams }, { data: insights }] = await Promise.all([
    supabase.from("subjects").select("*").eq("id", id).single(),
    supabase.from("documents").select("*").eq("subject_id", id).eq("is_exam", true).order("uploaded_at", { ascending: false }),
    supabase.from("exam_insights").select("*").eq("subject_id", id).maybeSingle(),
  ]);

  if (!subject) notFound();

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted">{subject.icon} {subject.name}</p>
        <h1 className="text-2xl font-bold mt-1">Exámenes anteriores</h1>
        <p className="text-sm text-muted mt-2 max-w-2xl">
          Sube exámenes de años anteriores. La app detecta qué temas se repiten y con qué estilo se preguntan, para
          generar preguntas de estudio que se parezcan de verdad a las del examen real.
        </p>
      </div>

      <DocumentUploader subjectId={id} topics={[]} isExam />

      {insights && <ExamInsightsPanel insights={insights.content as ExamInsightsContent} />}

      <ExamList exams={exams ?? []} />
    </div>
  );
}
