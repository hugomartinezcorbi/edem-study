"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { SourceSelector } from "@/components/pdf-generator/SourceSelector";
import { PdfConfigurator, type PdfConfig } from "@/components/pdf-generator/PdfConfigurator";
import { PdfPreview } from "@/components/pdf-generator/PdfPreview";
import type { OwnSubjectOption } from "@/lib/queries/pdf-generator";
import type { JoinedCommunity } from "@/lib/queries/community";
import type { PdfContent, PdfSourceMaterial } from "@/lib/types";
import { useState } from "react";
import { Sparkles } from "lucide-react";

type Step = "sources" | "config" | "result";

export function PdfGeneratorWizard({
  ownSubjects,
  communities,
}: {
  ownSubjects: OwnSubjectOption[];
  communities: JoinedCommunity[];
}) {
  const [step, setStep] = useState<Step>("sources");
  const [sources, setSources] = useState<PdfSourceMaterial[]>([]);
  const [freeText, setFreeText] = useState("");
  const [config, setConfig] = useState<PdfConfig>({
    title: "",
    subjectName: "",
    topics: "",
    style: "apuntes_completos",
    language: "Español",
    include: { definitions: true, formulas: true, examples: true, reviewQuestions: true, glossary: true, tableOfContents: true },
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ content: PdfContent; downloadUrl: string } | null>(null);

  const effectiveSources = [...sources, ...(freeText.trim() ? [{ type: "free_text" as const, id: "free-text", text: freeText }] : [])];

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/pdf/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: config.title || "Apuntes generados",
          subjectName: config.subjectName || "General",
          topics: config.topics.split(",").map((t) => t.trim()).filter(Boolean),
          style: config.style,
          language: config.language,
          include: config.include,
          sources: effectiveSources,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Error al generar el PDF");
      setResult({ content: body.content, downloadUrl: body.downloadUrl });
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["sources", "config", "result"] as Step[]).map((s, i) => (
          <div key={s} className="flex-1">
            <div className={`h-1.5 rounded-full ${["sources", "config", "result"].indexOf(step) >= i ? "bg-accent" : "bg-surface-hover"}`} />
          </div>
        ))}
      </div>

      <Card>
        <CardBody className="space-y-5">
          {step === "sources" && (
            <>
              <SourceSelector
                ownSubjects={ownSubjects}
                communities={communities}
                selected={sources}
                onChange={setSources}
                freeText={freeText}
                onFreeTextChange={setFreeText}
              />
              <Button className="w-full" disabled={effectiveSources.length === 0} onClick={() => setStep("config")}>
                Continuar
              </Button>
            </>
          )}

          {step === "config" && (
            <>
              <PdfConfigurator config={config} onChange={setConfig} />
              {error && <p className="text-sm text-danger">{error}</p>}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setStep("sources")}>
                  Atrás
                </Button>
                <Button className="flex-1" onClick={handleGenerate} loading={loading}>
                  <Sparkles size={16} /> Generar PDF
                </Button>
              </div>
            </>
          )}

          {step === "result" && result && <PdfPreview content={result.content} downloadUrl={result.downloadUrl} />}
        </CardBody>
      </Card>
    </div>
  );
}
