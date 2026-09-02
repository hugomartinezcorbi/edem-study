import { createClient } from "@/lib/supabase/server";
import { getNotifications } from "@/lib/queries/notifications";
import { redirect } from "next/navigation";
import { NotificationList } from "@/components/notifications/NotificationList";
import { MarkAllReadButton } from "@/components/notifications/MarkAllReadButton";

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const notifications = await getNotifications(supabase, user.id, 100);

  return (
    <div className="max-w-xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-heading font-bold">Notificaciones</h1>
        <MarkAllReadButton />
      </div>
      <NotificationList initialNotifications={notifications} />
    </div>
  );
}
