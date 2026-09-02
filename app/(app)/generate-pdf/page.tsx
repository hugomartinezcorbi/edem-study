import { createClient } from "@/lib/supabase/server";
import { getOwnSourceOptions } from "@/lib/queries/pdf-generator";
import { getJoinedCommunities } from "@/lib/queries/community";
import { redirect } from "next/navigation";
import { PdfGeneratorWizard } from "@/components/pdf-generator/PdfGeneratorWizard";

export default async function GeneratePdfPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [ownSubjects, communities] = await Promise.all([
    getOwnSourceOptions(supabase, user.id),
    getJoinedCommunities(supabase, user.id),
  ]);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold">Generador de apuntes con IA</h1>
        <p className="text-sm text-muted mt-1">
          Combina tus apuntes, los de la comunidad, el chat y el foro en un PDF único generado con Claude.
        </p>
      </div>
      <PdfGeneratorWizard ownSubjects={ownSubjects} communities={communities} />
    </div>
  );
}
