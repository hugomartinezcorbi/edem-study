"use client";

import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { X } from "lucide-react";

export function UploadNoteModal({ communityId, onClose }: { communityId: string; onClose: () => void }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError("Selecciona un archivo");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("communityId", communityId);
      formData.append("title", title);
      formData.append("description", description);
      formData.append("tags", tags);
      const res = await fetch("/api/shared-notes/upload", { method: "POST", body: formData });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error al subir");
      router.push(`/community/${communityId}/notes/${body.note.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-heading font-bold">Compartir apuntes</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input placeholder="Título" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Textarea placeholder="Descripción (opcional)" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          <Input placeholder="Etiquetas separadas por comas: tema-1, resumen, final" value={tags} onChange={(e) => setTags(e.target.value)} />
          <input ref={fileRef} type="file" accept=".pdf,.docx,.pptx,.png,.jpg,.jpeg" required className="w-full text-sm" />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>
            Subir
          </Button>
        </form>
      </div>
    </div>
  );
}
