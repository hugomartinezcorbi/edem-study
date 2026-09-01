"use client";

import { Button } from "@/components/ui/Button";
import type { Concept, Question } from "@/lib/types";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Lightbulb, RotateCw } from "lucide-react";

export function StudyPhaseCard({
  concept,
  question,
  userAnswer,
  onDone,
}: {
  concept: Concept;
  question: Question;
  userAnswer: string;
  onDone: () => void;
}) {
  const [personalizedExplanation, setPersonalizedExplanation] = useState<string | null>(null);
  const [alternativeExplanation, setAlternativeExplanation] = useState<string | null>(null);
  const [loadingAlt, setLoadingAlt] = useState(false);
  const [loadingInitial, setLoadingInitial] = useState(true);

  useEffect(() => {
    fetch("/api/study/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conceptId: concept.id,
        mode: "wrong",
        questionText: question.question_text,
        correctAnswer: question.correct_answer,
        userWrongAnswer: userAnswer,
      }),
    })
      .then((res) => res.json())
      .then((body) => setPersonalizedExplanation(body.explanation ?? null))
      .finally(() => setLoadingInitial(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [concept.id]);

  async function handleMoreExplanation() {
    setLoadingAlt(true);
    try {
      const res = await fetch("/api/study/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conceptId: concept.id, mode: "alternative" }),
      });
      const body = await res.json();
      setAlternativeExplanation(body.explanation ?? null);
    } finally {
      setLoadingAlt(false);
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div>
        <p className="text-xs font-semibold text-accent uppercase">{concept.title}</p>
        <p className="mt-1 text-base">{concept.definition}</p>
      </div>

      {concept.key_points.length > 0 && (
        <ul className="space-y-1 text-sm">
          {concept.key_points.map((kp, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-accent">•</span> {kp}
            </li>
          ))}
        </ul>
      )}

      <div className="rounded-xl bg-surface-hover p-4 space-y-2 text-sm">
        <p className="text-xs font-semibold text-muted uppercase">Fallaste esto</p>
        <p className="text-muted">{question.question_text}</p>
        <p>
          Tu respuesta: <span className="text-danger">{userAnswer || "(en blanco)"}</span>
        </p>
        <p>
          Correcta: <span className="text-success">{question.correct_answer}</span>
        </p>
      </div>

      <div className="rounded-xl border border-border p-4 space-y-2 text-sm">
        <p className="text-xs font-semibold text-muted uppercase flex items-center gap-1">
          <Lightbulb size={14} /> Por qué
        </p>
        {loadingInitial ? <p className="text-muted">Preparando explicación…</p> : <p>{personalizedExplanation}</p>}
      </div>

      {alternativeExplanation && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-accent/40 bg-accent/5 p-4 text-sm">
          <p className="text-xs font-semibold text-accent uppercase mb-1">Otro enfoque</p>
          <p>{alternativeExplanation}</p>
        </motion.div>
      )}

      <div className="flex gap-2">
        <Button onClick={onDone}>Entendido</Button>
        <Button variant="outline" onClick={handleMoreExplanation} loading={loadingAlt}>
          <RotateCw size={14} /> Necesito más explicación
        </Button>
      </div>
    </motion.div>
  );
}
