import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { NotesRenderer } from "@/components/notes/NotesRenderer";
import { Button } from "@/components/ui/Button";
import type { NotesContent } from "@/lib/types";
import { BookOpen, Upload } from "lucide-react";

export default async function NotesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: subject }, { data: notesRow }, { data: concepts }] = await Promise.all([
    supabase.from("subjects").select("*").eq("id", id).single(),
    supabase.from("notes").select("*").eq("subject_id", id).maybeSingle(),
    supabase.from("concepts").select("mastery_level").eq("subject_id", id),
  ]);

  if (!subject) notFound();

  if (!notesRow) {
    return (
      <div className="flex flex-col items-center justify-center text-center py-24 gap-4">
        <BookOpen size={40} className="text-muted" />
        <div>
          <h1 className="text-xl font-bold">Todavía no hay apuntes de {subject.name}</h1>
          <p className="text-sm text-muted mt-1 max-w-md">
            Sube material a esta asignatura y pulsa &quot;Actualizar apuntes&quot; para generar la primera versión.
          </p>
        </div>
        <Link href={`/subject/${id}/documents`}>
          <Button>
            <Upload size={16} /> Subir documentos
          </Button>
        </Link>
      </div>
    );
  }

  const total = concepts?.length ?? 0;
  const mastered = concepts?.filter((c) => c.mastery_level >= 0.8).length ?? 0;
  const masteryRatio = total ? mastered / total : 0;

  return <NotesRenderer notes={notesRow.content as NotesContent} color={subject.color} masteryRatio={masteryRatio} />;
}
