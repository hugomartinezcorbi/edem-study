"use client";

import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import type { PostType } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { X } from "lucide-react";

const TYPES: { value: PostType; label: string }[] = [
  { value: "discusion", label: "Discusión" },
  { value: "pregunta", label: "Pregunta" },
  { value: "recurso", label: "Recurso" },
  { value: "apuntes", label: "Apuntes" },
];

export function CreatePostModal({ communityId, onClose }: { communityId: string; onClose: () => void }) {
  const router = useRouter();
  const [postType, setPostType] = useState<PostType>("discusion");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/forum/create-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityId, title, content, postType }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error al publicar");
      router.push(`/community/${communityId}/forum/${body.post.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al publicar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-heading font-bold">Nueva publicación</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {TYPES.map((t) => (
            <button
              key={t.value}
              type="button"
              onClick={() => setPostType(t.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                postType === t.value ? "bg-accent text-accent-foreground" : "bg-surface-hover text-muted"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea
            placeholder="Escribe el contenido (admite markdown)…"
            rows={6}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            required
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>
            Publicar
          </Button>
        </form>
      </div>
    </div>
  );
}
