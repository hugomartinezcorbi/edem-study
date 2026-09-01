"use client";

import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import type { Question } from "@/lib/types";
import { useState } from "react";
import { motion } from "framer-motion";
import { Check, X } from "lucide-react";

export function QuestionCard({
  question,
  onAnswered,
}: {
  question: Question;
  onAnswered: (userAnswer: string, isCorrect: boolean) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [shortAnswerText, setShortAnswerText] = useState("");

  function handleOptionClick(optionText: string, isCorrect: boolean) {
    if (revealed) return;
    setSelected(optionText);
    setRevealed(true);
    setTimeout(() => onAnswered(optionText, isCorrect), 900);
  }

  function handleSelfGrade(isCorrect: boolean) {
    setRevealed(true);
    setTimeout(() => onAnswered(shortAnswerText, isCorrect), 500);
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
      <div className="flex items-center gap-2">
        <Badge>Dificultad {question.difficulty}/5</Badge>
      </div>
      <p className="text-lg font-medium leading-snug">{question.question_text}</p>

      {question.question_type !== "short_answer" && question.options ? (
        <div className="grid gap-2">
          {question.options.map((opt) => {
            const isSelected = selected === opt.text;
            const showCorrectness = revealed && (isSelected || opt.isCorrect);
            return (
              <button
                key={opt.text}
                onClick={() => handleOptionClick(opt.text, opt.isCorrect)}
                disabled={revealed}
                className={`flex items-center justify-between rounded-xl border px-4 py-3 text-left text-sm transition-colors cursor-pointer disabled:cursor-default ${
                  showCorrectness
                    ? opt.isCorrect
                      ? "border-success bg-success/10"
                      : isSelected
                      ? "border-danger bg-danger/10"
                      : "border-border"
                    : "border-border hover:bg-surface-hover"
                }`}
              >
                {opt.text}
                {showCorrectness && opt.isCorrect && <Check size={16} className="text-success" />}
                {showCorrectness && isSelected && !opt.isCorrect && <X size={16} className="text-danger" />}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          <Textarea
            rows={3}
            placeholder="Escribe tu respuesta…"
            value={shortAnswerText}
            onChange={(e) => setShortAnswerText(e.target.value)}
            disabled={revealed}
          />
          {!revealed ? (
            <Button onClick={() => setRevealed(true)} disabled={!shortAnswerText.trim()}>
              Comprobar
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="rounded-xl bg-surface-hover p-3 text-sm">
                <p className="text-xs font-semibold text-muted uppercase mb-1">Respuesta correcta</p>
                <p>{question.correct_answer}</p>
              </div>
              <p className="text-sm text-muted">¿Lo tenías bien?</p>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => handleSelfGrade(true)}>
                  <Check size={16} /> Sí, correcto
                </Button>
                <Button variant="secondary" onClick={() => handleSelfGrade(false)}>
                  <X size={16} /> No, fallé
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {revealed && question.explanation && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-muted">
          {question.explanation}
        </motion.p>
      )}
    </motion.div>
  );
}
