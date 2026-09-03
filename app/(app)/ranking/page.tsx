import { createClient } from "@/lib/supabase/server";
import { getTopUsers } from "@/lib/queries/ranking";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import Link from "next/link";
import { Trophy } from "lucide-react";

const MEDALS = ["🥇", "🥈", "🥉"];
const DEGREES = ["ADE", "IGE"] as const;

export default async function RankingPage({ searchParams }: { searchParams: Promise<{ degree?: string }> }) {
  const { degree: degreeParam } = await searchParams;
  const degree = degreeParam === "IGE" ? "IGE" : "ADE";
  const supabase = await createClient();
  const users = await getTopUsers(supabase, degree);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Trophy size={22} className="text-accent" />
        <h1 className="text-2xl font-heading font-bold">Ranking por titulación</h1>
      </div>
      <p className="text-sm text-muted -mt-4">
        XP por aprender de verdad: dominar un concepto, completar una sesión de estudio, mantener la racha, mejorar
        algo que fallaste antes, y ayudar a otros en la comunidad. Nada por tiempo conectado.
      </p>

      <div className="flex rounded-xl bg-surface-hover p-1 max-w-xs">
        {DEGREES.map((d) => (
          <Link
            key={d}
            href={`/ranking?degree=${d}`}
            className={`flex-1 text-center rounded-lg py-2 text-sm font-medium transition-colors ${
              degree === d ? "bg-surface shadow-sm text-foreground" : "text-muted"
            }`}
          >
            {d}
          </Link>
        ))}
      </div>

      <Card>
        <CardBody className="divide-y divide-border p-0">
          {users.map((u, i) => (
            <div key={u.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="w-6 text-center font-heading font-bold text-sm text-muted shrink-0">
                  {MEDALS[i] ?? i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-medium truncate">
                    {u.display_name} <span className="text-muted text-sm">@{u.username}</span>
                  </p>
                  {u.is_verified && (
                    <Badge className="text-accent bg-accent/10 mt-0.5">Verificado</Badge>
                  )}
                </div>
              </div>
              <span className="font-heading font-bold text-accent shrink-0">{u.reputation_score} XP</span>
            </div>
          ))}
          {users.length === 0 && (
            <p className="text-sm text-muted text-center py-12">Todavía no hay actividad en {degree}.</p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
