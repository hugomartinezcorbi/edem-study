import { requireAdmin } from "@/lib/admin";
import { getAllCommunitiesForAdmin } from "@/lib/queries/admin";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { CommunityActionButtons } from "@/components/admin/CommunityActionButtons";

export default async function AdminCommunitiesPage() {
  const supabase = await requireAdmin();
  if (!supabase) redirect("/dashboard");

  const communities = await getAllCommunitiesForAdmin(supabase);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">{communities.length} comunidades</p>
      {communities.map((c) => (
        <Card key={c.id}>
          <CardBody className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium">
                {c.name} {c.is_archived && <Badge className="ml-1">Archivada</Badge>}
              </p>
              <p className="text-xs text-muted mt-1">
                {c.member_count} miembros · {c.messageCount} mensajes · {c.postCount} publicaciones
              </p>
            </div>
            <CommunityActionButtons communityId={c.id} isArchived={c.is_archived} />
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
