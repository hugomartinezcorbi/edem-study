"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/ui/ProgressBar";
import type { NotesContent } from "@/lib/types";
import { useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Download, Lightbulb, Search } from "lucide-react";

export function NotesRenderer({
  notes,
  color,
  masteryRatio,
}: {
  notes: NotesContent;
  color: string;
  masteryRatio: number;
}) {
  const [glossaryQuery, setGlossaryQuery] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);
  const [exporting, setExporting] = useState(false);

  const filteredGlossary = useMemo(
    () =>
      notes.glossary.filter(
        (g) =>
          g.term.toLowerCase().includes(glossaryQuery.toLowerCase()) ||
          g.definition.toLowerCase().includes(glossaryQuery.toLowerCase())
      ),
    [notes.glossary, glossaryQuery]
  );

  async function handleExportPdf() {
    setExporting(true);
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ]);
      const node = contentRef.current;
      if (!node) return;
      const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      while (heightLeft > 0) {
        position -= pageHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      pdf.save(`${notes.title.replace(/\s+/g, "_")}.pdf`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-[220px_1fr] gap-8">
      <aside className="hidden lg:block">
        <div className="sticky top-20 space-y-1 text-sm">
          <p className="label-mono mb-2">Índice</p>
          {notes.topics.map((t) => (
            <a
              key={t.id}
              href={`#topic-${t.number}`}
              className="block px-3 py-1.5 rounded-lg hover:bg-surface-hover text-muted hover:text-foreground transition-colors truncate"
            >
              {t.number}. {t.title}
            </a>
          ))}
          <a href="#glosario" className="block px-3 py-1.5 rounded-lg hover:bg-surface-hover text-muted hover:text-foreground transition-colors">
            Glosario
          </a>
        </div>
      </aside>

      <div className="space-y-8 min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">{notes.title}</h1>
            <p className="text-sm text-muted mt-1">
              {notes.totalTopics} temas · actualizado el {new Date(notes.lastUpdated).toLocaleDateString("es-ES")}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportPdf} loading={exporting}>
            <Download size={14} /> Exportar PDF
          </Button>
        </div>

        <div>
          <div className="flex justify-between text-xs text-muted mb-1">
            <span>Contenido dominado</span>
            <span>{Math.round(masteryRatio * 100)}%</span>
          </div>
          <ProgressBar value={masteryRatio} color={color} />
        </div>

        <div ref={contentRef} className="space-y-12 bg-background">
          {notes.topics.map((topic) => (
            <section key={topic.id} id={`topic-${topic.number}`} className="scroll-mt-20 space-y-5">
              <div>
                <h2 className="text-xl font-bold flex items-center gap-2">
                  <span style={{ color }}>{topic.number}.</span> {topic.title}
                </h2>
                <p className="text-muted text-sm mt-1">{topic.summary}</p>
              </div>

              {topic.sections.map((section, i) => (
                <div key={i} className="space-y-3 pl-4 border-l-2" style={{ borderColor: color }}>
                  <h3 className="font-semibold">{section.title}</h3>
                  <div className="prose-notes text-sm">
                    <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
                      {section.content}
                    </ReactMarkdown>
                  </div>

                  {section.keyPoints.length > 0 && (
                    <ul className="space-y-1 text-sm">
                      {section.keyPoints.map((kp, j) => (
                        <li key={j} className="flex gap-2">
                          <span className="text-success">✓</span> {kp}
                        </li>
                      ))}
                    </ul>
                  )}

                  {section.definitions.length > 0 && (
                    <div className="grid sm:grid-cols-2 gap-2">
                      {section.definitions.map((d, j) => (
                        <div key={j} className="rounded-xl bg-surface-hover p-3 text-sm">
                          <p className="font-semibold">{d.term}</p>
                          <p className="text-muted">{d.definition}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {section.formulas.length > 0 && (
                    <div className="space-y-2">
                      {section.formulas.map((f, j) => (
                        <div key={j} className="rounded-xl bg-surface-hover p-3 overflow-x-auto">
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {`$$${f}$$`}
                          </ReactMarkdown>
                        </div>
                      ))}
                    </div>
                  )}

                  {section.examples.length > 0 && (
                    <div className="space-y-2">
                      {section.examples.map((ex, j) => (
                        <div key={j} className="flex gap-2 rounded-xl border border-border p-3 text-sm">
                          <Lightbulb size={16} className="text-warning shrink-0 mt-0.5" />
                          <span>{ex}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {section.connections && <p className="text-xs text-muted italic">🔗 {section.connections}</p>}
                </div>
              ))}

              {topic.practiceQuestions.length > 0 && (
                <div className="rounded-xl bg-surface-hover p-4">
                  <p className="label-mono mb-2">Preguntas de repaso</p>
                  <ul className="space-y-1 text-sm list-disc pl-4">
                    {topic.practiceQuestions.map((q, j) => (
                      <li key={j}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          ))}

          {notes.conceptMap && (
            <section className="space-y-2">
              <h2 className="text-xl font-bold">Mapa conceptual</h2>
              <p className="text-sm text-muted">{notes.conceptMap}</p>
            </section>
          )}

          <section id="glosario" className="scroll-mt-20 space-y-4">
            <h2 className="text-xl font-bold">Glosario</h2>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={glossaryQuery}
                onChange={(e) => setGlossaryQuery(e.target.value)}
                placeholder="Buscar término…"
                className="w-full rounded-xl border border-border bg-surface pl-9 pr-3 py-2.5 text-sm outline-none focus:border-accent"
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-2">
              {filteredGlossary.map((g, i) => (
                <div key={i} className="rounded-xl bg-surface-hover p-3 text-sm">
                  <p className="font-semibold">{g.term}</p>
                  <p className="text-muted">{g.definition}</p>
                </div>
              ))}
              {filteredGlossary.length === 0 && <Badge>No hay resultados</Badge>}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
