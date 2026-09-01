import { AuthForm } from "@/components/auth/AuthForm";
import { EdemLogo } from "@/components/ui/EdemLogo";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BookOpen, Brain, RotateCcw, Upload } from "lucide-react";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <main className="flex-1 grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-center px-16 bg-accent text-accent-foreground">
        <div className="max-w-md space-y-8">
          <div>
            <EdemLogo variant="light" size="lg" />
            <h1 className="text-4xl font-bold mt-6 leading-tight">
              Tus apuntes, siempre actualizados. Tu estudio, siempre a punto.
            </h1>
          </div>
          <div className="space-y-4 text-sm">
            <Step icon={<Upload size={18} />} title="Sube material" desc="PDFs, diapositivas, fotos de apuntes o exámenes anteriores." />
            <Step icon={<BookOpen size={18} />} title="Se generan apuntes" desc="Una única página por asignatura que crece con cada documento." />
            <Step icon={<Brain size={18} />} title="Estudia con FEVR" desc="Fallar, Estudiar, Explicar, Volver: el método que fija de verdad." />
            <Step icon={<RotateCcw size={18} />} title="Repite cuando toca" desc="Repetición espaciada para no olvidar nada antes del examen." />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-6">
          <div className="lg:hidden text-center flex flex-col items-center">
            <EdemLogo size="md" />
            <h1 className="text-2xl font-bold mt-3">Estudio personalizado</h1>
          </div>
          <AuthForm />
        </div>
      </div>
    </main>
  );
}

function Step({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="mt-0.5 h-8 w-8 flex items-center justify-center rounded-lg bg-white/15 shrink-0">{icon}</div>
      <div>
        <p className="font-semibold">{title}</p>
        <p className="opacity-80">{desc}</p>
      </div>
    </div>
  );
}
