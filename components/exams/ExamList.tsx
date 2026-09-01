"use client";

import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { AnalyzeExamButton } from "@/components/exams/AnalyzeExamButton";
import type { Document } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, FileText, Trash2 } from "lucide-react";

export function ExamList({ exams }: { exams: Document[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/documents/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  if (exams.length === 0) {
    return <p className="text-sm text-muted text-center py-12">Todavía no has subido exámenes de esta asignatura.</p>;
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {exams.map((doc) => (
        <Card key={doc.id}>
          <CardBody className="space-y-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <FileText size={18} className="text-muted shrink-0" />
                <p className="text-sm font-medium truncate" title={doc.filename}>
                  {doc.filename}
                </p>
              </div>
              <button
                onClick={() => handleDelete(doc.id)}
                disabled={deletingId === doc.id}
                className="text-muted hover:text-danger transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                aria-label="Eliminar examen"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="flex items-center justify-between gap-2">
              {doc.processed ? (
                <Badge className="text-success bg-success/10">
                  <CheckCircle2 size={12} /> Analizado
                </Badge>
              ) : doc.extracted_text ? (
                <AnalyzeExamButton documentId={doc.id} />
              ) : (
                <Badge className="text-warning bg-warning/10">Extrayendo texto…</Badge>
              )}
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
