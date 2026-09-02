"use client";

import { Button } from "@/components/ui/Button";
import { NoteCard } from "@/components/shared-notes/NoteCard";
import { UploadNoteModal } from "@/components/shared-notes/UploadNoteModal";
import type { SharedNote } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus } from "lucide-react";

const SORTS = [
  { value: "recent", label: "Recientes" },
  { value: "rating", label: "Mejor valorados" },
  { value: "downloads", label: "Más descargados" },
];

export function NotesLibrary({
  communityId,
  notes,
  isMember,
  currentSort,
}: {
  communityId: string;
  notes: SharedNote[];
  isMember: boolean;
  currentSort: string;
}) {
  const router = useRouter();
  const [showUpload, setShowUpload] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {SORTS.map((s) => (
            <button
              key={s.value}
              onClick={() => router.push(`/community/${communityId}/notes${s.value !== "recent" ? `?sort=${s.value}` : ""}`)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium cursor-pointer transition-colors ${
                currentSort === s.value ? "bg-accent text-accent-foreground" : "bg-surface-hover text-muted"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        {isMember && (
          <Button size="sm" onClick={() => setShowUpload(true)}>
            <Plus size={14} /> Subir apuntes
          </Button>
        )}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {notes.map((note) => (
          <NoteCard key={note.id} note={note} communityId={communityId} />
        ))}
        {notes.length === 0 && (
          <p className="text-sm text-muted text-center py-12 col-span-full">Todavía no hay apuntes compartidos.</p>
        )}
      </div>

      {showUpload && <UploadNoteModal communityId={communityId} onClose={() => setShowUpload(false)} />}
    </div>
  );
}
