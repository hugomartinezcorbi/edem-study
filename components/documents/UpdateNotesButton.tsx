"use client";

import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles } from "lucide-react";

export function UpdateNotesButton({ subjectId, pendingCount }: { subjectId: string; pendingCount: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/notes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjectId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error al generar los apuntes");
      router.push(`/subject/${subjectId}/notes`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar los apuntes");
    } finally {
      setLoading(false);
    }
  }

  if (pendingCount === 0) return null;

  return (
    <div className="space-y-2">
      <Button onClick={handleClick} loading={loading}>
        <Sparkles size={16} />
        {loading ? "Actualizando apuntes…" : `Actualizar apuntes (${pendingCount} nuevo${pendingCount === 1 ? "" : "s"})`}
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  );
}
