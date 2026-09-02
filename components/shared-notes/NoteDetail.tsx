"use client";

import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { RatingStars } from "@/components/shared-notes/RatingStars";
import type { NoteRating, SharedNote } from "@/lib/types";
import { useState } from "react";
import { Download, Star } from "lucide-react";

export function NoteDetail({ note, ratings, myRating }: { note: SharedNote; ratings: NoteRating[]; myRating: number }) {
  const [downloading, setDownloading] = useState(false);
  const [rating, setRating] = useState(myRating);
  const [comment, setComment] = useState("");
  const [ratingSubmitted, setRatingSubmitted] = useState(myRating > 0);

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/shared-notes/${note.id}/download`, { method: "POST" });
      const body = await res.json();
      if (res.ok) window.open(body.url, "_blank");
    } finally {
      setDownloading(false);
    }
  }

  async function handleRate(value: number) {
    setRating(value);
    await fetch("/api/shared-notes/rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ noteId: note.id, rating: value, comment: comment || null }),
    });
    setRatingSubmitted(true);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardBody className="space-y-3">
          <h1 className="text-xl font-heading font-bold">{note.title}</h1>
          <p className="text-sm text-muted">
            {note.author?.display_name} · {new Date(note.created_at).toLocaleDateString("es-ES")}
          </p>
          {note.description && <p className="text-sm">{note.description}</p>}
          <div className="flex flex-wrap gap-1.5">
            {note.tags.map((tag) => (
              <span key={tag} className="text-xs rounded-full bg-surface-hover px-2 py-0.5 text-muted">
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted pt-1">
            <span className="flex items-center gap-1">
              <Star size={14} className="text-warning fill-warning" /> {note.rating_average.toFixed(1)} ({note.rating_count})
            </span>
            <span className="flex items-center gap-1">
              <Download size={14} /> {note.download_count} descargas
            </span>
          </div>
          <Button onClick={handleDownload} loading={downloading}>
            <Download size={16} /> Descargar
          </Button>
        </CardBody>
      </Card>

      <Card>
        <CardBody className="space-y-3">
          <p className="label-mono">{ratingSubmitted ? "Tu valoración" : "Valora estos apuntes"}</p>
          {!ratingSubmitted && (
            <Textarea
              rows={2}
              placeholder="Comentario opcional…"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          )}
          <RatingStars value={rating} onChange={handleRate} size={22} />
        </CardBody>
      </Card>

      {ratings.length > 0 && (
        <div className="space-y-3">
          <p className="label-mono">Valoraciones</p>
          {ratings
            .filter((r) => r.comment)
            .map((r) => (
              <Card key={r.id}>
                <CardBody className="space-y-1">
                  <RatingStars value={r.rating} readOnly size={14} />
                  <p className="text-sm">{r.comment}</p>
                </CardBody>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
