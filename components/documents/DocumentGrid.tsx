"use client";

import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import type { Document, Topic } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { CheckCircle2, Clock, File, FileImage, FileText, Trash2 } from "lucide-react";

const fileIcons = {
  pdf: FileText,
  docx: FileText,
  pptx: FileText,
  image: FileImage,
  other: File,
};

export function DocumentGrid({ documents, topics }: { documents: Document[]; topics: Topic[] }) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const topicNameById = new Map(topics.map((t) => [t.id, t.name]));

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      await fetch(`/api/documents/${id}`, { method: "DELETE" });
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  if (documents.length === 0) {
    return <p className="text-sm text-muted text-center py-12">Todavía no has subido nada aquí.</p>;
  }

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {documents.map((doc) => {
        const Icon = fileIcons[doc.file_type];
        return (
          <Card key={doc.id}>
            <CardBody className="space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon size={18} className="text-muted shrink-0" />
                  <p className="text-sm font-medium truncate" title={doc.filename}>
                    {doc.filename}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(doc.id)}
                  disabled={deletingId === doc.id}
                  className="text-muted hover:text-danger transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                  aria-label="Eliminar documento"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge>{new Date(doc.uploaded_at).toLocaleDateString("es-ES")}</Badge>
                {doc.topic_id && topicNameById.get(doc.topic_id) && <Badge>{topicNameById.get(doc.topic_id)}</Badge>}
                {doc.processed ? (
                  <Badge className="text-success bg-success/10">
                    <CheckCircle2 size={12} /> Procesado
                  </Badge>
                ) : (
                  <Badge className="text-warning bg-warning/10">
                    <Clock size={12} /> Pendiente
                  </Badge>
                )}
              </div>
            </CardBody>
          </Card>
        );
      })}
    </div>
  );
}
