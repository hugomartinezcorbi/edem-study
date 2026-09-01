"use client";

import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { X } from "lucide-react";

export function CreateCommunityModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [university, setUniversity] = useState("EDEM");
  const [degree, setDegree] = useState("ADE");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/community/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, university, degree, description }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error al crear la comunidad");
      router.push(`/community/${body.community.id}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear");
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
          <h2 className="text-lg font-heading font-bold">Nueva comunidad</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground cursor-pointer">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <Input placeholder="Nombre de la asignatura" value={name} onChange={(e) => setName(e.target.value)} required />
          <div className="grid grid-cols-2 gap-3">
            <Input placeholder="Universidad" value={university} onChange={(e) => setUniversity(e.target.value)} />
            <Input placeholder="Carrera" value={degree} onChange={(e) => setDegree(e.target.value)} />
          </div>
          <Textarea placeholder="Descripción (opcional)" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" loading={loading}>
            Crear comunidad
          </Button>
        </form>
      </div>
    </div>
  );
}
