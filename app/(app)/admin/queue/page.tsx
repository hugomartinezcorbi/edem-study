import { requireAdmin } from "@/lib/admin";
import { getPendingQueue } from "@/lib/queries/admin";
import { redirect } from "next/navigation";
import { ModerationQueueList } from "@/components/admin/ModerationQueueList";

export default async function AdminQueuePage() {
  const supabase = await requireAdmin();
  if (!supabase) redirect("/dashboard");

  const items = await getPendingQueue(supabase);

  return <ModerationQueueList items={items} />;
}
