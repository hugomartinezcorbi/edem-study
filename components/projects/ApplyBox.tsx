"use client";

import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function ApplyBox({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pitch, setPitch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/projects/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, pitch }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error al enviar la solicitud");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar la solicitud");
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} className="w-full">
        Solicitar unirme
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        placeholder="Cuéntale al creador qué aportarías o qué mejorarías del proyecto…"
        rows={4}
        value={pitch}
        onChange={(e) => setPitch(e.target.value)}
        required
        autoFocus
      />
      {error && <p className="text-sm text-danger">{error}</p>}
      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1" loading={loading}>
          Enviar solicitud
        </Button>
      </div>
    </form>
  );
}
