import { requireAdmin } from "@/lib/admin";
import { getAllUsersForAdmin } from "@/lib/queries/admin";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { UserActionButtons } from "@/components/admin/UserActionButtons";

export default async function AdminUsersPage() {
  const supabase = await requireAdmin();
  if (!supabase) redirect("/dashboard");

  const users = await getAllUsersForAdmin(supabase);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{users.length} usuarios</p>
      {users.map((u) => (
        <Card key={u.id}>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">
                {u.display_name} <span className="text-muted text-sm">@{u.username}</span>
              </p>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <Badge>{u.reputation_score} pts</Badge>
                {u.rejectedCount > 0 && <Badge className="text-danger bg-danger/10">{u.rejectedCount} rechazos</Badge>}
                {u.is_banned && <Badge className="text-danger bg-danger/10">Baneado</Badge>}
                {u.is_muted && <Badge className="text-warning bg-warning/10">Silenciado</Badge>}
                {u.is_verified && <Badge className="text-accent bg-accent/10">Verificado</Badge>}
              </div>
            </div>
            <UserActionButtons userId={u.id} isBanned={u.is_banned} isMuted={u.is_muted} />
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
