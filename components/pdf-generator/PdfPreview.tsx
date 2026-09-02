import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import type { PdfContent } from "@/lib/types";
import { Download } from "lucide-react";

export function PdfPreview({ content, downloadUrl }: { content: PdfContent; downloadUrl: string }) {
  return (
    <div className="space-y-4">
      <Card>
        <CardBody className="space-y-3">
          <div>
            <h2 className="text-lg font-heading font-bold">{content.title}</h2>
            <p className="text-sm text-muted">
              {content.subject} · {content.content.sections.length} secciones · {content.sourceCount} fuentes
            </p>
          </div>
          <a href={downloadUrl} target="_blank" rel="noreferrer">
            <Button>
              <Download size={16} /> Descargar PDF
            </Button>
          </a>
        </CardBody>
      </Card>

      <div className="space-y-3">
        {content.content.sections.map((section, i) => (
          <Card key={i}>
            <CardBody className="space-y-1">
              <p className="font-semibold">{section.title}</p>
              <p className="text-sm text-muted line-clamp-3">{section.content}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      {content.content.summary && (
        <Card>
          <CardBody>
            <p className="label-mono mb-1">Resumen</p>
            <p className="text-sm">{content.content.summary}</p>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
