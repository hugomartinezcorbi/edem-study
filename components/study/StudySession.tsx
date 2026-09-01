"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { QuestionCard } from "@/components/study/QuestionCard";
import { StudyPhaseCard } from "@/components/study/StudyPhaseCard";
import { ExplainPhaseCard } from "@/components/study/ExplainPhaseCard";
import type { Concept, Question } from "@/lib/types";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";

type StudyMode = "today" | "subject" | "quick";

interface Item {
  concept: Concept;
  question: Question;
}

type Stage = "setup" | "fallar" | "fallar-summary" | "estudiar" | "explicar" | "volver" | "summary" | "empty";

interface FinalStats {
  totalQuestions: number;
  correctAnswers: number;
  durationMinutes: number;
}

export function StudySession({
  mode,
  subjectId,
  subjectName,
  color,
}: {
  mode: StudyMode;
  subjectId?: string;
  subjectName?: string;
  color: string;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("setup");
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sessionId, setSessionId] = useState<string | null>(null);
  const [fallarItems, setFallarItems] = useState<Item[]>([]);
  const [fallarIndex, setFallarIndex] = useState(0);
  const [fallarResults, setFallarResults] = useState<{ conceptId: string; correctInFallar: boolean; questionId: string; userAnswer: string }[]>([]);

  const [failedItems, setFailedItems] = useState<Item[]>([]);
  const [estudiarIndex, setEstudiarIndex] = useState(0);
  const [explicarIndex, setExplicarIndex] = useState(0);

  const [volverItems, setVolverItems] = useState<Item[]>([]);
  const [volverIndex, setVolverIndex] = useState(0);
  const [volverResults, setVolverResults] = useState<{ conceptId: string; correctInVolver: boolean }[]>([]);

  const [finalStats, setFinalStats] = useState<FinalStats | null>(null);

  async function handleStart() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/study/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, subjectId, count }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "No se pudo empezar la sesión");
      setSessionId(body.session.id);
      setFallarItems(body.items);
      setStage("fallar");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al empezar");
    } finally {
      setLoading(false);
    }
  }

  async function recordAnswer(item: Item, phase: string, userAnswer: string, isCorrect: boolean) {
    await fetch("/api/study/answer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        questionId: item.question.id,
        conceptId: item.concept.id,
        phase,
        userAnswer,
        isCorrect,
      }),
    });
  }

  async function handleFallarAnswered(userAnswer: string, isCorrect: boolean) {
    const item = fallarItems[fallarIndex];
    await recordAnswer(item, "fallar", userAnswer, isCorrect);
    const nextResults = [
      ...fallarResults,
      { conceptId: item.concept.id, correctInFallar: isCorrect, questionId: item.question.id, userAnswer },
    ];
    setFallarResults(nextResults);

    if (fallarIndex + 1 < fallarItems.length) {
      setFallarIndex(fallarIndex + 1);
      return;
    }

    const failed = fallarItems.filter((it) => nextResults.some((r) => r.conceptId === it.concept.id && !r.correctInFallar));
    setFailedItems(failed);

    if (failed.length === 0) {
      await finalize(nextResults, []);
    } else {
      setStage("fallar-summary");
    }
  }

  function startEstudiar() {
    setEstudiarIndex(0);
    setStage("estudiar");
  }

  function handleEstudiarDone() {
    if (estudiarIndex + 1 < failedItems.length) {
      setEstudiarIndex(estudiarIndex + 1);
    } else {
      setExplicarIndex(0);
      setStage("explicar");
    }
  }

  async function handleExplicarDone() {
    if (explicarIndex + 1 < failedItems.length) {
      setExplicarIndex(explicarIndex + 1);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/study/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conceptIds: failedItems.map((it) => it.concept.id),
          excludeQuestionIds: fallarResults.filter((r) => !r.correctInFallar).map((r) => r.questionId),
        }),
      });
      const body = await res.json();
      setVolverItems(body.items ?? []);
      setVolverIndex(0);
      setStage("volver");
    } finally {
      setLoading(false);
    }
  }

  async function handleVolverAnswered(userAnswer: string, isCorrect: boolean) {
    const item = volverItems[volverIndex];
    await recordAnswer(item, "volver", userAnswer, isCorrect);
    const nextResults = [...volverResults, { conceptId: item.concept.id, correctInVolver: isCorrect }];
    setVolverResults(nextResults);

    if (volverIndex + 1 < volverItems.length) {
      setVolverIndex(volverIndex + 1);
    } else {
      await finalize(fallarResults, nextResults);
    }
  }

  async function finalize(
    fResults: { conceptId: string; correctInFallar: boolean }[],
    vResults: { conceptId: string; correctInVolver: boolean }[]
  ) {
    setLoading(true);
    try {
      const results = fResults.map((r) => ({
        conceptId: r.conceptId,
        correctInFallar: r.correctInFallar,
        correctInVolver: vResults.find((v) => v.conceptId === r.conceptId)?.correctInVolver ?? false,
      }));
      const res = await fetch("/api/study/update-spaced-repetition", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, results }),
      });
      const body = await res.json();
      setFinalStats(body);
      setStage("summary");
    } finally {
      setLoading(false);
    }
  }

  if (stage === "setup") {
    return (
      <Card className="max-w-lg mx-auto">
        <CardBody className="space-y-6 text-center">
          <div>
            <p className="text-sm text-muted uppercase font-semibold">
              {mode === "today" ? "Lo que toca hoy" : mode === "quick" ? "Repaso rápido" : subjectName}
            </p>
            <h1 className="text-xl font-bold mt-1">Fallar → Estudiar → Explicar → Volver</h1>
          </div>
          {mode !== "quick" && (
            <div>
              <p className="text-sm text-muted mb-2">¿Cuántos conceptos quieres repasar?</p>
              <div className="flex justify-center gap-2">
                {[5, 10, 15].map((n) => (
                  <button
                    key={n}
                    onClick={() => setCount(n)}
                    className={`h-10 w-10 rounded-full text-sm font-medium transition-colors cursor-pointer ${
                      count === n ? "bg-accent text-accent-foreground" : "bg-surface-hover text-muted"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button onClick={handleStart} loading={loading} size="lg" className="w-full">
            Empezar
          </Button>
        </CardBody>
      </Card>
    );
  }

  const phaseSteps: { key: Stage; label: string; bg: string; text: string }[] = [
    { key: "fallar", label: "Fallar", bg: "var(--color-fallar-bg)", text: "var(--color-fallar-text)" },
    { key: "estudiar", label: "Estudiar", bg: "var(--color-estudiar-bg)", text: "var(--color-estudiar-text)" },
    { key: "explicar", label: "Explicar", bg: "var(--color-explicar-bg)", text: "var(--color-explicar-text)" },
    { key: "volver", label: "Volver", bg: "var(--color-volver-bg)", text: "var(--color-volver-text)" },
  ];
  const currentPhaseIdx = phaseSteps.findIndex((p) => p.key === stage);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {currentPhaseIdx >= 0 && (
        <div className="flex gap-2">
          {phaseSteps.map((p, i) => {
            const active = i <= currentPhaseIdx;
            return (
              <div
                key={p.key}
                className={`flex-1 text-center py-2 rounded-[10px] font-heading text-sm font-bold transition-opacity ${
                  active ? "" : "opacity-40"
                } ${i === currentPhaseIdx ? "ring-2 ring-offset-1 ring-offset-background" : ""}`}
                style={
                  active
                    ? { backgroundColor: p.bg, color: p.text, ...(i === currentPhaseIdx ? ({ "--tw-ring-color": p.text } as React.CSSProperties) : {}) }
                    : { backgroundColor: "var(--color-surface-hover)", color: "var(--color-muted)" }
                }
              >
                {p.label}
              </div>
            );
          })}
        </div>
      )}

      <Card>
        <CardBody>
          <AnimatePresence mode="wait">
            {stage === "fallar" && (
              <motion.div key={fallarItems[fallarIndex]?.question.id}>
                <p className="text-xs text-muted mb-3">
                  Pregunta {fallarIndex + 1} de {fallarItems.length}
                </p>
                <QuestionCard question={fallarItems[fallarIndex].question} onAnswered={handleFallarAnswered} />
              </motion.div>
            )}

            {stage === "fallar-summary" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-5">
                <p className="text-3xl font-bold">
                  {fallarResults.filter((r) => r.correctInFallar).length}/{fallarResults.length}
                </p>
                <p className="text-sm text-muted">Vamos a repasar a fondo los {failedItems.length} que has fallado.</p>
                <div className="grid gap-2 text-left max-w-sm mx-auto">
                  {fallarResults.map((r) => {
                    const item = fallarItems.find((it) => it.concept.id === r.conceptId)!;
                    return (
                      <div key={r.conceptId} className="flex items-center gap-2 text-sm">
                        {r.correctInFallar ? (
                          <CheckCircle2 size={16} className="text-success shrink-0" />
                        ) : (
                          <XCircle size={16} className="text-danger shrink-0" />
                        )}
                        <span className="truncate">{item.concept.title}</span>
                      </div>
                    );
                  })}
                </div>
                <Button onClick={startEstudiar} size="lg">
                  Continuar a Estudiar
                </Button>
              </motion.div>
            )}

            {stage === "estudiar" && failedItems[estudiarIndex] && (
              <motion.div key={failedItems[estudiarIndex].concept.id}>
                <p className="text-xs text-muted mb-3">
                  Concepto {estudiarIndex + 1} de {failedItems.length}
                </p>
                <StudyPhaseCard
                  concept={failedItems[estudiarIndex].concept}
                  question={failedItems[estudiarIndex].question}
                  userAnswer={fallarResults.find((r) => r.conceptId === failedItems[estudiarIndex].concept.id)?.userAnswer ?? ""}
                  onDone={handleEstudiarDone}
                />
              </motion.div>
            )}

            {stage === "explicar" && failedItems[explicarIndex] && (
              <motion.div key={failedItems[explicarIndex].concept.id}>
                <p className="text-xs text-muted mb-3">
                  Concepto {explicarIndex + 1} de {failedItems.length}
                </p>
                <ExplainPhaseCard concept={failedItems[explicarIndex].concept} onDone={handleExplicarDone} />
              </motion.div>
            )}

            {stage === "volver" && volverItems[volverIndex] && (
              <motion.div key={volverItems[volverIndex].question.id}>
                <p className="text-xs text-muted mb-3">
                  Pregunta {volverIndex + 1} de {volverItems.length}
                </p>
                <QuestionCard question={volverItems[volverIndex].question} onAnswered={handleVolverAnswered} />
              </motion.div>
            )}

            {stage === "summary" && finalStats && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center space-y-6">
                <div>
                  <p className="text-4xl font-bold" style={{ color }}>
                    {Math.round((finalStats.correctAnswers / Math.max(1, finalStats.totalQuestions)) * 100)}%
                  </p>
                  <p className="text-sm text-muted mt-1">
                    {finalStats.correctAnswers}/{finalStats.totalQuestions} correctas · {finalStats.durationMinutes} min
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted mb-1">Progreso</p>
                  <ProgressBar value={finalStats.correctAnswers / Math.max(1, finalStats.totalQuestions)} color={color} />
                </div>
                <div className="flex justify-center gap-3">
                  <Button variant="outline" onClick={() => router.push("/dashboard")}>
                    Volver al dashboard
                  </Button>
                  <Button onClick={() => window.location.reload()}>Estudiar otra vez</Button>
                </div>
              </motion.div>
            )}

            {stage === "explicar" && loading && (
              <p className="text-center text-sm text-muted mt-4">Preparando la ronda final…</p>
            )}
          </AnimatePresence>
        </CardBody>
      </Card>
    </div>
  );
}
