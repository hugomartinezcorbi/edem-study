import { createClient } from "@/lib/supabase/server";
import { extractText, inferFileType } from "@/lib/document-processor";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const subjectId = formData.get("subjectId") as string | null;
  const topicId = (formData.get("topicId") as string | null) || null;
  const isExam = formData.get("isExam") === "true";

  if (!file || !subjectId) {
    return NextResponse.json({ error: "Falta el archivo o la asignatura" }, { status: 400 });
  }

  const { data: subject } = await supabase.from("subjects").select("id").eq("id", subjectId).single();
  if (!subject) return NextResponse.json({ error: "Asignatura no encontrada" }, { status: 404 });

  const fileType = inferFileType(file.name, file.type);
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const storagePath = `${user.id}/${subjectId}/${crypto.randomUUID()}-${file.name}`;
  const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, buffer, {
    contentType: file.type || "application/octet-stream",
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  let extractedText: string | null = null;
  let extractionError: string | null = null;
  try {
    extractedText = fileType === "other" ? null : await extractText(buffer, fileType);
  } catch (err) {
    extractionError = err instanceof Error ? err.message : "Error al extraer el texto";
  }

  const { data: document, error: insertError } = await supabase
    .from("documents")
    .insert({
      subject_id: subjectId,
      topic_id: topicId,
      user_id: user.id,
      filename: file.name,
      file_url: storagePath,
      file_type: fileType,
      extracted_text: extractedText,
      processed: false,
      is_exam: isExam,
    })
    .select("*")
    .single();

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 });

  return NextResponse.json({ document, extractionError });
}
