import { createClient } from "@/lib/supabase/server";
import { getCommunity, getMembership } from "@/lib/queries/community";
import { notFound, redirect } from "next/navigation";
import { CommunityTabs } from "@/components/community/CommunityTabs";
import { JoinLeaveButton } from "@/components/community/JoinLeaveButton";
import { Users } from "lucide-react";

export default async function CommunityDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [community, membership] = await Promise.all([
    getCommunity(supabase, id),
    getMembership(supabase, id, user.id),
  ]);
  if (!community) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-heading font-bold">{community.name}</h1>
          {(community.university || community.degree) && (
            <p className="text-xs text-muted-light font-mono uppercase">
              {[community.university, community.degree].filter(Boolean).join(" · ")}
            </p>
          )}
          <p className="flex items-center gap-1 text-xs text-muted mt-1">
            <Users size={12} /> {community.member_count} miembros
          </p>
        </div>
        <JoinLeaveButton communityId={id} isMember={!!membership} />
      </div>

      {!membership && (
        <div className="rounded-xl bg-surface-hover border border-border p-3 text-sm text-muted">
          Únete a la comunidad para participar en el chat, publicar y subir apuntes. Puedes leer el foro y la
          biblioteca sin unirte.
        </div>
      )}

      <CommunityTabs communityId={id} />

      <div className="pt-2">{children}</div>
    </div>
  );
}
