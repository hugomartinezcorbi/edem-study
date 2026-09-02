import type { SupabaseClient } from "@supabase/supabase-js";
import type { NotesContent, PdfSourceMaterial } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

const MAX_CHARS_PER_SOURCE = 20000;

function notesContentToText(notes: NotesContent): string {
  return notes.topics
    .map((t) => `## ${t.title}\n${t.summary}\n` + t.sections.map((s) => `### ${s.title}\n${s.content}`).join("\n"))
    .join("\n\n");
}

/** Resolves a list of source references into {label, content} pairs, respecting the caller's own RLS access. */
export async function resolveSources(
  db: DB,
  sources: PdfSourceMaterial[]
): Promise<{ label: string; content: string }[]> {
  const resolved: { label: string; content: string }[] = [];

  for (const source of sources) {
    if (source.type === "free_text") {
      if (source.text?.trim()) {
        resolved.push({ label: source.label ?? "Texto libre", content: source.text.slice(0, MAX_CHARS_PER_SOURCE) });
      }
      continue;
    }

    if (source.type === "own_notes") {
      const { data } = await db.from("notes").select("content").eq("id", source.id).maybeSingle();
      if (data?.content) {
        resolved.push({
          label: source.label ?? "Mis apuntes",
          content: notesContentToText(data.content as NotesContent).slice(0, MAX_CHARS_PER_SOURCE),
        });
      }
      continue;
    }

    if (source.type === "shared_note") {
      const { data } = await db.from("shared_notes").select("title, extracted_text").eq("id", source.id).maybeSingle();
      if (data?.extracted_text) {
        resolved.push({
          label: source.label ?? `Apuntes de la comunidad: ${data.title}`,
          content: data.extracted_text.slice(0, MAX_CHARS_PER_SOURCE),
        });
      }
      continue;
    }

    if (source.type === "document") {
      const { data } = await db.from("documents").select("filename, extracted_text").eq("id", source.id).maybeSingle();
      if (data?.extracted_text) {
        resolved.push({
          label: source.label ?? `Documento: ${data.filename}`,
          content: data.extracted_text.slice(0, MAX_CHARS_PER_SOURCE),
        });
      }
      continue;
    }

    if (source.type === "post") {
      const { data } = await db.from("posts").select("title, content").eq("id", source.id).maybeSingle();
      if (data) {
        resolved.push({
          label: source.label ?? `Post del foro: ${data.title}`,
          content: `${data.title}\n${data.content}`.slice(0, MAX_CHARS_PER_SOURCE),
        });
      }
      continue;
    }

    if (source.type === "chat_message") {
      // `id` doubles as a comma-separated list of chat_messages ids selected by the user.
      const ids = source.id.split(",").filter(Boolean);
      if (ids.length === 0) continue;
      const { data } = await db
        .from("chat_messages")
        .select("content, user_profiles(display_name)")
        .in("id", ids)
        .order("created_at", { ascending: true });
      const text = (data ?? [])
        .map((m) => `${(m.user_profiles as unknown as { display_name?: string } | null)?.display_name ?? "Usuario"}: ${m.content}`)
        .join("\n");
      if (text) {
        resolved.push({ label: source.label ?? "Mensajes del chat", content: text.slice(0, MAX_CHARS_PER_SOURCE) });
      }
    }
  }

  return resolved;
}
