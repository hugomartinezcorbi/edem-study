import { createClient } from "@/lib/supabase/server";
import { extractText } from "@/lib/document-processor";
import { NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { documentId } = await request.json();
  const { data: document } = await supabase.from("documents").select("*").eq("id", documentId).single();
  if (!document) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  const { data: fileData, error: downloadError } = await supabase.storage
    .from("documents")
    .download(document.file_url);
  if (downloadError) return NextResponse.json({ error: downloadError.message }, { status: 500 });

  const buffer = Buffer.from(await fileData.arrayBuffer());

  try {
    const extractedText = await extractText(buffer, document.file_type);
    const { error: updateError } = await supabase
      .from("documents")
      .update({ extracted_text: extractedText })
      .eq("id", documentId);
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 });
    return NextResponse.json({ extractedText });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error al extraer el texto";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
