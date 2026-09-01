"use client";

import { Button } from "@/components/ui/Button";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkles } from "lucide-react";

export function AnalyzeExamButton({ documentId }: { documentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/exams/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error al analizar el examen");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al analizar el examen");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-1">
      <Button size="sm" variant="outline" onClick={handleClick} loading={loading}>
        <Sparkles size={14} />
        Analizar
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
