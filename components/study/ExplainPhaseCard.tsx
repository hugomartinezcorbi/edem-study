"use client";

import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { Concept } from "@/lib/types";
import { useState } from "react";
import { motion } from "framer-motion";

export function ExplainPhaseCard({ concept, onDone }: { concept: Concept; onDone: () => void }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ score: number; feedback: string; isCorrect: boolean } | null>(null);

  async function handleSubmit() {
    setLoading(true);
    try {
      const res = await fetch("/api/study/evaluate-explanation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conceptId: concept.id, studentExplanation: text }),
      });
      setResult(await res.json());
    } finally {
      setLoading(false);
    }
  }

  function handleRetry() {
    setResult(null);
    setText("");
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-accent uppercase">{concept.title}</p>
        <p className="text-sm text-muted mt-1">Explícalo con tus propias palabras, como si se lo contaras a un compañero.</p>
      </div>

      <Textarea
        rows={5}
        placeholder="Explica este concepto con tus propias palabras…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={!!result}
      />

      {!result ? (
        <Button onClick={handleSubmit} loading={loading} disabled={text.trim().length < 10}>
          Enviar explicación
        </Button>
      ) : (
        <div className="space-y-3">
          <div>
            <div className="flex justify-between text-xs text-muted mb-1">
              <span>Comprensión</span>
              <span>{result.score}/100</span>
            </div>
            <ProgressBar value={result.score / 100} color={result.isCorrect ? "var(--color-success)" : "var(--color-warning)"} />
          </div>
          <p className="text-sm">{result.feedback}</p>
          <div className="flex gap-2">
            {result.isCorrect ? (
              <Button onClick={onDone}>Siguiente</Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleRetry}>
                  Intentar de nuevo
                </Button>
                <Button variant="ghost" onClick={onDone}>
                  Seguir de todas formas
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}
