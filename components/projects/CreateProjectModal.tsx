"use client";

import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import type { ProjectCategory } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { X } from "lucide-react";

const CATEGORIES: { value: ProjectCategory; label: string }[] = [
  { value: "startup", label: "Startup" },
  { value: "app", label: "App" },
  { value: "proyecto", label: "Proyecto de clase" },
  { value: "investigacion", label: "Investigación" },
  { value: "otro", label: "Otro" },
];

export function CreateProjectModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [category, setCategory] = useState<ProjectCategory>("proyecto");
  const [title, setTitle] = useState("");
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/projects/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          tagline,
          description,
          category,
          lookingFor: lookingFor.split(",").map((s) => s.trim()).filter(Boolean),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error al publicar");
      router.push(`/projects/${body.project.id}`);
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
          <h2 className="text-lg font-heading font-bold">Nuevo proyecto</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setCategory(c.value)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                category === c.value ? "bg-accent text-accent-foreground" : "bg-surface-hover text-muted"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input placeholder="Nombre del proyecto" value={title} onChange={(e) => setTitle(e.target.value)} required />
          <Input
            placeholder="Resumen en una frase"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            required
            maxLength={140}
          />
          <Textarea
            placeholder="Describe el proyecto: qué es, en qué punto está, qué necesitas…"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <Input
            placeholder="Buscas (opcional, separa con comas): diseño, backend, marketing…"
            value={lookingFor}
            onChange={(e) => setLookingFor(e.target.value)}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>
            Publicar proyecto
          </Button>
        </form>
      </div>
    </div>
  );
}
