import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { DocumentUploader } from "@/components/documents/DocumentUploader";
import { DocumentGrid } from "@/components/documents/DocumentGrid";
import { UpdateNotesButton } from "@/components/documents/UpdateNotesButton";

export default async function DocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: subject }, { data: documents }, { data: topics }] = await Promise.all([
    supabase.from("subjects").select("*").eq("id", id).single(),
    supabase.from("documents").select("*").eq("subject_id", id).eq("is_exam", false).order("uploaded_at", { ascending: false }),
    supabase.from("topics").select("*").eq("subject_id", id).order("order_index"),
  ]);

  if (!subject) notFound();

  const pendingCount = (documents ?? []).filter((d) => !d.processed && d.extracted_text).length;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-muted">{subject.icon} {subject.name}</p>
        <h1 className="text-2xl font-bold mt-1">Documentos</h1>
      </div>

      <DocumentUploader subjectId={id} topics={topics ?? []} />

      <UpdateNotesButton subjectId={id} pendingCount={pendingCount} />

      <DocumentGrid documents={documents ?? []} topics={topics ?? []} />
    </div>
  );
}
