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
  if (!file) return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });

  const fileType = inferFileType(file.name, file.type);
  if (fileType === "other") {
    return NextResponse.json({ error: "Formato no compatible (usa PDF, DOCX, PPTX o imagen)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let text: string;
  try {
    text = await extractText(buffer, fileType);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Error al extraer el texto" }, { status: 500 });
  }
  if (!text.trim()) {
    return NextResponse.json({ error: "No se pudo extraer texto de ese archivo" }, { status: 422 });
  }

  return NextResponse.json({ filename: file.name, text });
}
