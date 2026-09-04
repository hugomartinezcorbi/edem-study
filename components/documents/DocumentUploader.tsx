"use client";

import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";
import type { Topic } from "@/lib/types";

const MAX_FILE_BYTES = 100 * 1024 * 1024;

export function DocumentUploader({
  subjectId,
  topics,
  isExam,
}: {
  subjectId: string;
  topics: Topic[];
  isExam?: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topicId, setTopicId] = useState("");

  async function uploadFiles(files: FileList | File[]) {
    setError(null);
    setUploading(true);
    const supabase = createClient();
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sesión caducada, vuelve a entrar");

      for (const file of Array.from(files)) {
        if (file.size > MAX_FILE_BYTES) {
          throw new Error(`${file.name} supera los 100 MB`);
        }

        // Straight to Supabase Storage: going through our own API route would
        // cap uploads at Vercel's ~4.5 MB request-body limit.
        const storagePath = `${user.id}/${subjectId}/${crypto.randomUUID()}-${file.name}`;
        const { error: uploadError } = await supabase.storage.from("documents").upload(storagePath, file, {
          contentType: file.type || "application/octet-stream",
        });
        if (uploadError) throw new Error(`Error al subir ${file.name}: ${uploadError.message}`);

        const res = await fetch("/api/documents/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subjectId,
            topicId: topicId || null,
            isExam: !!isExam,
            storagePath,
            filename: file.name,
            contentType: file.type,
          }),
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Error al procesar ${file.name}`);
        }
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir el archivo");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      {topics.length > 0 && (
        <select
          value={topicId}
          onChange={(e) => setTopicId(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-2 text-sm"
        >
          <option value="">Sin tema asignado</option>
          {topics.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      )}

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
        }}
        className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? "border-accent bg-accent/5" : "border-border"
        }`}
      >
        <UploadCloud className="mx-auto mb-3 text-muted" size={28} />
        <p className="text-sm text-muted mb-3">Arrastra archivos aquí o</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.pptx,.png,.jpg,.jpeg,.webp"
          className="hidden"
          onChange={(e) => e.target.files && uploadFiles(e.target.files)}
        />
        <Button type="button" variant="outline" size="sm" loading={uploading} onClick={() => inputRef.current?.click()}>
          Selecciona archivos
        </Button>
        <p className="text-xs text-muted mt-3">PDF, DOCX, PPTX o imágenes de apuntes · hasta 100 MB</p>
      </div>

      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
