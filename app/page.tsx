import { AuthForm } from "@/components/auth/AuthForm";
import { EdemLogo } from "@/components/ui/EdemLogo";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const PHASES = [
  { label: "Fallar", bg: "var(--color-fallar-bg)", text: "var(--color-fallar-text)" },
  { label: "Estudiar", bg: "var(--color-estudiar-bg)", text: "var(--color-estudiar-text)" },
  { label: "Explicar", bg: "var(--color-explicar-bg)", text: "var(--color-explicar-text)" },
  { label: "Volver", bg: "var(--color-volver-bg)", text: "var(--color-volver-text)" },
];

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main className="flex-1 grid lg:grid-cols-2 bg-background">
      <div className="flex flex-col justify-center px-8 sm:px-16 py-12 bg-surface">
        <div className="w-full max-w-sm mx-auto lg:mx-0 space-y-8">
          <EdemLogo size="sm" showTagline={false} />

          <div className="space-y-3">
            <h1 className="text-4xl font-bold leading-tight tracking-tight text-heading">
              Sube tu material.
              <br />
              Estudia lo que importa.
            </h1>
            <p className="text-muted leading-relaxed">
              Apuntes que se generan solos y un método de estudio que te hace fallar, entender y recordar. Para
              ADE en EDEM.
            </p>
          </div>

          <AuthForm />

          <p className="font-mono text-xs text-muted-light">EDEM · ADE · Primer curso · 10 asignaturas</p>
        </div>
      </div>

      <div className="hidden lg:flex flex-col items-center justify-center px-16 dotted-grid bg-surface-hover relative overflow-hidden">
        <div className="text-center mb-10">
          <EdemLogo size="lg" showTagline={false} />
          <p className="label-mono mt-2">Tu segundo cerebro para ADE</p>
        </div>

        <div className="w-full max-w-md space-y-5">
          <div className="bg-surface border border-border rounded-2xl p-5 shadow-[0_20px_50px_rgba(20,40,50,0.07)] space-y-3">
            <p className="label-mono">Método de estudio</p>
            <div className="flex gap-2">
              {PHASES.map((p) => (
                <div
                  key={p.label}
                  className="flex-1 text-center py-2.5 rounded-[10px] font-heading text-sm font-bold"
                  style={{ backgroundColor: p.bg, color: p.text }}
                >
                  {p.label}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-5 shadow-[0_20px_50px_rgba(20,40,50,0.07)] space-y-2">
            <p className="label-mono">Apuntes generados</p>
            <div className="h-1.5 w-full rounded-full bg-surface-hover overflow-hidden">
              <div className="h-full rounded-full bg-accent" style={{ width: "59%" }} />
            </div>
            <p className="text-xs font-mono text-muted">59% de conceptos dominados · v7</p>
          </div>
        </div>
      </div>
    </main>
  );
}
