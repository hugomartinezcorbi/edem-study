import { createClient } from "@/lib/supabase/server";
import { extractText, inferFileType } from "@/lib/document-processor";
import { NextResponse } from "next/server";

export const maxDuration = 60;

/**
 * The file itself is uploaded straight from the browser to Supabase Storage —
 * routing the bytes through here would cap every upload at Vercel's ~4.5 MB
 * request-body limit. This only registers an already-stored file: it re-reads
 * it from the bucket to extract its text and writes the documents row.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { subjectId, topicId, isExam, storagePath, filename, contentType } = await request.json();
  if (!subjectId || !storagePath || !filename) {
    return NextResponse.json({ error: "Faltan datos del archivo" }, { status: 400 });
  }
  // Storage RLS already scopes writes to the user's own folder; re-check here so
  // nobody can register a file that isn't theirs.
  if (!storagePath.startsWith(`${user.id}/`)) {
    return NextResponse.json({ error: "Ruta de archivo no válida" }, { status: 403 });
  }

  const { data: subject } = await supabase.from("subjects").select("id").eq("id", subjectId).single();
  if (!subject) return NextResponse.json({ error: "Asignatura no encontrada" }, { status: 404 });

  const fileType = inferFileType(filename, contentType ?? "");

  let extractedText: string | null = null;
  let extractionError: string | null = null;
  if (fileType !== "other") {
    try {
      const { data: blob, error: downloadError } = await supabase.storage.from("documents").download(storagePath);
      if (downloadError || !blob) throw new Error(downloadError?.message ?? "No se pudo leer el archivo subido");
      extractedText = await extractText(Buffer.from(await blob.arrayBuffer()), fileType);
    } catch (err) {
      extractionError = err instanceof Error ? err.message : "Error al extraer el texto";
    }
  }

  const { data: document, error: insertError } = await supabase
    .from("documents")
    .insert({
      subject_id: subjectId,
      topic_id: topicId || null,
      user_id: user.id,
      filename,
      file_url: storagePath,
      file_type: fileType,
      extracted_text: extractedText,
      processed: false,
      is_exam: !!isExam,
    })
    .select("*")
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({ document, extractionError });
}
