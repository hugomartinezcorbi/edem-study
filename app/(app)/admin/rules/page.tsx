import { requireAdmin } from "@/lib/admin";
import { getModerationRules } from "@/lib/queries/admin";
import { redirect } from "next/navigation";
import { RulesManager } from "@/components/admin/RulesManager";

export default async function AdminRulesPage() {
  const supabase = await requireAdmin();
  if (!supabase) redirect("/dashboard");

  const rules = await getModerationRules(supabase);

  return <RulesManager rules={rules} />;
}
