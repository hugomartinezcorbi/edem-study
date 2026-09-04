"use client";

import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import type { RequestCategory } from "@/lib/types";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Send } from "lucide-react";

const CATEGORIES: { value: RequestCategory; label: string }[] = [
  { value: "sugerencia", label: "Sugerencia" },
  { value: "error", label: "Algo no funciona" },
  { value: "ayuda", label: "Necesito ayuda" },
  { value: "otro", label: "Otro" },
];

export function RequestForm() {
  const router = useRouter();
  const [category, setCategory] = useState<RequestCategory>("sugerencia");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "No se pudo enviar");
      setMessage("");
      setSent(true);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => setCategory(c.value)}
            className={`px-3 py-1.5 rounded-full text-sm transition-colors cursor-pointer ${
              category === c.value
                ? "bg-accent text-accent-foreground"
                : "bg-surface-hover text-muted hover:text-foreground"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <Textarea
        rows={4}
        placeholder="Cuéntame qué necesitas o qué mejorarías. Lo leo yo directamente."
        value={message}
        onChange={(e) => {
          setMessage(e.target.value);
          if (sent) setSent(false);
        }}
        maxLength={2000}
        required
      />

      {error && <p className="text-sm text-danger">{error}</p>}
      {sent && <p className="text-sm text-success">Enviada. Te avisaré por aquí cuando la lea.</p>}

      <Button type="submit" loading={loading} disabled={!message.trim()}>
        <Send size={15} /> Enviar petición
      </Button>
    </form>
  );
}
