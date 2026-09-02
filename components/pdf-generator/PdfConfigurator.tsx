"use client";

import { Input } from "@/components/ui/Input";
import type { PdfStyle } from "@/lib/types";

const STYLES: { value: PdfStyle; label: string; desc: string }[] = [
  { value: "resumen_ejecutivo", label: "Resumen ejecutivo", desc: "Breve, solo puntos clave" },
  { value: "apuntes_completos", label: "Apuntes completos", desc: "Explicaciones detalladas con ejemplos" },
  { value: "guia_estudio", label: "Guía de estudio", desc: "Para preparar examen, con preguntas" },
  { value: "esquema", label: "Esquema", desc: "Estructura jerárquica, poco texto" },
];

export interface PdfConfig {
  title: string;
  subjectName: string;
  topics: string;
  style: PdfStyle;
  language: string;
  include: {
    definitions: boolean;
    formulas: boolean;
    examples: boolean;
    reviewQuestions: boolean;
    glossary: boolean;
    tableOfContents: boolean;
  };
}

export function PdfConfigurator({ config, onChange }: { config: PdfConfig; onChange: (c: PdfConfig) => void }) {
  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-3">
        <Input placeholder="Título del documento" value={config.title} onChange={(e) => onChange({ ...config, title: e.target.value })} />
        <Input placeholder="Asignatura" value={config.subjectName} onChange={(e) => onChange({ ...config, subjectName: e.target.value })} />
      </div>
      <Input
        placeholder="Temas que cubre (separados por comas)"
        value={config.topics}
        onChange={(e) => onChange({ ...config, topics: e.target.value })}
      />

      <div className="space-y-2">
        <p className="label-mono">Estilo</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {STYLES.map((s) => (
            <button
              key={s.value}
              type="button"
              onClick={() => onChange({ ...config, style: s.value })}
              className={`text-left p-3 rounded-xl border transition-colors cursor-pointer ${
                config.style === s.value ? "border-accent bg-accent/5" : "border-border hover:bg-surface-hover"
              }`}
            >
              <p className="text-sm font-medium">{s.label}</p>
              <p className="text-xs text-muted">{s.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="label-mono">Idioma</p>
        <div className="flex gap-2">
          {["Español", "English"].map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => onChange({ ...config, language: lang })}
              className={`px-3 py-1.5 rounded-full text-sm cursor-pointer transition-colors ${
                config.language === lang ? "bg-accent text-accent-foreground" : "bg-surface-hover text-muted"
              }`}
            >
              {lang}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="label-mono">Incluir</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {(
            [
              ["definitions", "Definiciones"],
              ["formulas", "Fórmulas"],
              ["examples", "Ejemplos"],
              ["reviewQuestions", "Preguntas de repaso"],
              ["glossary", "Glosario"],
              ["tableOfContents", "Índice"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={config.include[key]}
                onChange={(e) => onChange({ ...config, include: { ...config.include, [key]: e.target.checked } })}
              />
              {label}
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
