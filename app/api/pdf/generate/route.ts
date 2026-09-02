import { createClient } from "@/lib/supabase/server";
import { generateMixedSourcePdf } from "@/lib/claude";
import { resolveSources } from "@/lib/pdf-sources";
import { renderPdf } from "@/lib/pdf-renderer";
import type { PdfContent } from "@/lib/types";
import { NextResponse } from "next/server";

export const maxDuration = 60;

const MAX_GENERATIONS_PER_HOUR = 5;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("pdf_generations")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("created_at", hourAgo);
  if ((count ?? 0) >= MAX_GENERATIONS_PER_HOUR) {
    return NextResponse.json({ error: "Límite de 5 PDFs por hora alcanzado. Inténtalo más tarde." }, { status: 429 });
  }

  const { title, subjectName, topics, style, language, include, sources, subjectId, communitySubjectId } =
    await request.json();

  const resolvedSources = await resolveSources(supabase, sources);
  if (resolvedSources.length === 0) {
    return NextResponse.json({ error: "No se pudo obtener contenido de las fuentes seleccionadas" }, { status: 400 });
  }

  const draft = await generateMixedSourcePdf({
    title,
    subjectName,
    topics: topics ?? [],
    style,
    language: language ?? "español",
    include,
    sources: resolvedSources,
  });

  const content: PdfContent = draft as unknown as PdfContent;
  const pdfBuffer = await renderPdf(content);

  const path = `${user.id}/${crypto.randomUUID()}.pdf`;
  const { error: uploadError } = await supabase.storage.from("generated-pdfs").upload(path, pdfBuffer, {
    contentType: "application/pdf",
  });
  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 });

  const { data: signed } = await supabase.storage.from("generated-pdfs").createSignedUrl(path, 60 * 60 * 24);

  const { data: generation, error } = await supabase
    .from("pdf_generations")
    .insert({
      user_id: user.id,
      subject_id: subjectId ?? null,
      community_subject_id: communitySubjectId ?? null,
      title,
      source_materials: sources,
      generated_pdf_url: path,
      content_json: content,
    })
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ generation, downloadUrl: signed?.signedUrl, content });
}
