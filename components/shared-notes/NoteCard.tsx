import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import type { SharedNote } from "@/lib/types";
import Link from "next/link";
import { Download, Star } from "lucide-react";

export function NoteCard({ note, communityId }: { note: SharedNote; communityId?: string }) {
  const href = communityId
    ? `/community/${communityId}/notes/${note.id}`
    : `/community/${note.community_subject_id}/notes/${note.id}`;

  return (
    <Link href={href}>
      <Card className="h-full hover:bg-surface-hover transition-colors">
        <CardBody className="space-y-2">
          <p className="font-semibold leading-snug line-clamp-2">{note.title}</p>
          {note.description && <p className="text-sm text-muted line-clamp-2">{note.description}</p>}

          <div className="flex flex-wrap gap-1">
            {note.tags.slice(0, 3).map((tag) => (
              <Badge key={tag}>{tag}</Badge>
            ))}
          </div>

          <div className="flex items-center justify-between text-xs text-muted pt-1">
            <span className="flex items-center gap-1">
              <Star size={12} className="text-warning fill-warning" />
              {note.rating_average.toFixed(1)} ({note.rating_count})
            </span>
            <span className="flex items-center gap-1">
              <Download size={12} /> {note.download_count}
            </span>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}
