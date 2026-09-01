import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { ExamInsightsContent } from "@/lib/types";
import { ListChecks } from "lucide-react";

export function ExamInsightsPanel({ insights }: { insights: ExamInsightsContent }) {
  const maxFrequency = Math.max(1, ...insights.recurringTopics.map((t) => t.frequency));

  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <ListChecks size={18} className="text-accent" />
        <div>
          <p className="font-semibold">Lo que más se repite en tus exámenes</p>
          <p className="text-xs text-muted">Basado en {insights.totalExams} examen{insights.totalExams === 1 ? "" : "es"} subido{insights.totalExams === 1 ? "" : "s"}</p>
        </div>
      </CardHeader>
      <CardBody className="space-y-6">
        <div className="space-y-3">
          {insights.recurringTopics
            .sort((a, b) => b.frequency - a.frequency)
            .map((topic) => (
              <div key={topic.topic}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium">{topic.topic}</span>
                  <span className="text-muted">{topic.frequency}x</span>
                </div>
                <ProgressBar value={topic.frequency / maxFrequency} />
                {topic.exampleQuestions[0] && (
                  <p className="text-xs text-muted mt-1 italic">“{topic.exampleQuestions[0]}”</p>
                )}
              </div>
            ))}
        </div>

        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <p className="label-mono mb-1">Estilo de las preguntas</p>
            <p>{insights.questionStyleNotes}</p>
          </div>
          <div>
            <p className="label-mono mb-1">Dificultad</p>
            <p>{insights.difficultyProfile}</p>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
