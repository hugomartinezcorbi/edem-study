"use client";

import { Textarea } from "@/components/ui/Input";
import type { OwnSubjectOption } from "@/lib/queries/pdf-generator";
import type { JoinedCommunity } from "@/lib/queries/community";
import type { PdfSourceMaterial } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import { Search, Star, Upload, X } from "lucide-react";

interface Props {
  ownSubjects: OwnSubjectOption[];
  communities: JoinedCommunity[];
  selected: PdfSourceMaterial[];
  onChange: (sources: PdfSourceMaterial[]) => void;
  freeText: string;
  onFreeTextChange: (text: string) => void;
}

function sourceKey(s: PdfSourceMaterial) {
  return `${s.type}:${s.id}`;
}

export function SourceSelector({ ownSubjects, communities, selected, onChange, freeText, onFreeTextChange }: Props) {
  const [communityId, setCommunityId] = useState(communities[0]?.id ?? "");
  const [sharedNotes, setSharedNotes] = useState<{ id: string; title: string; rating_average: number; rating_count: number }[]>([]);
  const [posts, setPosts] = useState<{ id: string; title: string; post_type: string }[]>([]);
  const [chatQuery, setChatQuery] = useState("");
  const [chatResults, setChatResults] = useState<{ id: string; content: string; user_profiles: { display_name: string } | null }[]>([]);
  const [chatSelectedIds, setChatSelectedIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!communityId) return;
    fetch(`/api/pdf/available-sources?communityId=${communityId}`)
      .then((r) => r.json())
      .then((body) => {
        setSharedNotes(body.sharedNotes ?? []);
        setPosts(body.posts ?? []);
      });
  }, [communityId]);

  useEffect(() => {
    if (!communityId) return;
    const timeout = setTimeout(() => {
      fetch(`/api/pdf/chat-search?communityId=${communityId}&q=${encodeURIComponent(chatQuery)}`)
        .then((r) => r.json())
        .then((body) => setChatResults(body.messages ?? []));
    }, 300);
    return () => clearTimeout(timeout);
  }, [communityId, chatQuery]);

  const selectedKeys = new Set(selected.map(sourceKey));

  function toggle(source: PdfSourceMaterial) {
    const key = sourceKey(source);
    if (selectedKeys.has(key)) {
      onChange(selected.filter((s) => sourceKey(s) !== key));
    } else {
      onChange([...selected, source]);
    }
  }

  function toggleChatMessage(id: string) {
    const next = chatSelectedIds.includes(id) ? chatSelectedIds.filter((i) => i !== id) : [...chatSelectedIds, id];
    setChatSelectedIds(next);
    const withoutChat = selected.filter((s) => s.type !== "chat_message");
    onChange(
      next.length > 0
        ? [...withoutChat, { type: "chat_message", id: next.join(","), label: `${next.length} mensajes del chat` }]
        : withoutChat
    );
  }

  const uploadedFiles = selected.filter((s) => s.type === "uploaded_file");

  async function handleFileUpload(file: File) {
    setUploading(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/pdf/extract-upload", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error al subir el archivo");
      onChange([...selected, { type: "uploaded_file", id: crypto.randomUUID(), label: body.filename, text: body.text }]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Error al subir el archivo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-6">
      {ownSubjects.length > 0 && (
        <section className="space-y-2">
          <p className="label-mono">Mis apuntes y documentos</p>
          {ownSubjects.map((subject) => (
            <div key={subject.id} className="space-y-1">
              {subject.hasNotes && subject.notesId && (
                <label className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedKeys.has(`own_notes:${subject.notesId}`)}
                    onChange={() => toggle({ type: "own_notes", id: subject.notesId!, label: `Mis apuntes de ${subject.name}` })}
                  />
                  Mis apuntes de {subject.name}
                </label>
              )}
              {subject.documents.map((doc) => (
                <label key={doc.id} className="flex items-center gap-2 text-sm py-1 pl-4 cursor-pointer text-muted">
                  <input
                    type="checkbox"
                    checked={selectedKeys.has(`document:${doc.id}`)}
                    onChange={() => toggle({ type: "document", id: doc.id, label: doc.filename })}
                  />
                  {doc.filename}
                </label>
              ))}
            </div>
          ))}
        </section>
      )}

      {communities.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="label-mono">Contenido de la comunidad</p>
            <select
              value={communityId}
              onChange={(e) => setCommunityId(e.target.value)}
              className="text-sm rounded-lg border border-border bg-surface px-2 py-1"
            >
              {communities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {sharedNotes.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted">Apuntes compartidos</p>
              {sharedNotes.map((note) => (
                <label key={note.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedKeys.has(`shared_note:${note.id}`)}
                    onChange={() => toggle({ type: "shared_note", id: note.id, label: note.title })}
                  />
                  <span className="flex-1 truncate">{note.title}</span>
                  <span className="flex items-center gap-0.5 text-xs text-muted-light">
                    <Star size={11} className="fill-warning text-warning" /> {note.rating_average.toFixed(1)}
                  </span>
                </label>
              ))}
            </div>
          )}

          {posts.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-muted">Posts del foro</p>
              {posts.map((post) => (
                <label key={post.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedKeys.has(`post:${post.id}`)}
                    onChange={() => toggle({ type: "post", id: post.id, label: post.title })}
                  />
                  {post.title}
                </label>
              ))}
            </div>
          )}

          <div className="space-y-1">
            <p className="text-xs text-muted">Mensajes del chat</p>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={chatQuery}
                onChange={(e) => setChatQuery(e.target.value)}
                placeholder="Buscar en el chat…"
                className="w-full rounded-lg border border-border bg-surface pl-8 pr-2 py-1.5 text-sm outline-none focus:border-accent"
              />
            </div>
            <div className="max-h-40 overflow-y-auto space-y-1 mt-1">
              {chatResults.map((msg) => (
                <label key={msg.id} className="flex items-start gap-2 text-xs py-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={chatSelectedIds.includes(msg.id)}
                    onChange={() => toggleChatMessage(msg.id)}
                    className="mt-0.5"
                  />
                  <span className="truncate">
                    <strong>{msg.user_profiles?.display_name}:</strong> {msg.content}
                  </span>
                </label>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="space-y-2">
        <p className="label-mono">Sube tu propio archivo</p>
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.pptx,.png,.jpg,.jpeg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFileUpload(file);
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="w-full flex items-center justify-center gap-2 rounded-xl border border-dashed border-border py-3 text-sm text-muted hover:border-accent hover:text-foreground transition-colors cursor-pointer disabled:opacity-50"
        >
          <Upload size={15} /> {uploading ? "Extrayendo texto…" : "PDF, Word, PowerPoint o foto"}
        </button>
        {uploadError && <p className="text-xs text-danger">{uploadError}</p>}
        {uploadedFiles.length > 0 && (
          <div className="space-y-1">
            {uploadedFiles.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-2 text-sm py-1 pl-1 text-muted">
                <span className="truncate">{f.label}</span>
                <button
                  type="button"
                  onClick={() => onChange(selected.filter((s) => s.id !== f.id))}
                  className="text-muted-light hover:text-danger cursor-pointer shrink-0"
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-2">
        <p className="label-mono">Texto libre (opcional)</p>
        <Textarea
          rows={3}
          placeholder="Pega o escribe contenido adicional…"
          value={freeText}
          onChange={(e) => onFreeTextChange(e.target.value)}
        />
      </section>

      <p className="text-xs text-muted-light font-mono">{selected.length} fuente{selected.length === 1 ? "" : "s"} seleccionada{selected.length === 1 ? "" : "s"}</p>
    </div>
  );
}
