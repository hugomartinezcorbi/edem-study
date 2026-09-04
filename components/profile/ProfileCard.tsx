import { Card, CardBody } from "@/components/ui/Card";
import { ReputationBadge } from "@/components/profile/ReputationBadge";
import type { ProfilePageData } from "@/lib/queries/profile";
import { GraduationCap } from "lucide-react";

export function ProfileCard({ data, isOwn }: { data: ProfilePageData; isOwn: boolean }) {
  const { profile } = data;
  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 rounded-full bg-surface-hover flex items-center justify-center text-xl font-heading font-bold overflow-hidden shrink-0">
            {profile.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.avatar_url} alt={profile.display_name} className="h-full w-full object-cover" />
            ) : (
              profile.display_name.slice(0, 1).toUpperCase()
            )}
          </div>
          <div className="min-w-0">
            <p className="font-heading font-bold text-lg truncate">{profile.display_name}</p>
            <p className="text-sm text-muted">@{profile.username}</p>
            <ReputationBadge score={profile.reputation_score} />
          </div>
        </div>

        {profile.bio && <p className="text-sm text-muted">{profile.bio}</p>}

        {(profile.university || profile.degree || profile.year) && (
          <p className="flex items-center gap-1.5 text-sm text-muted">
            <GraduationCap size={14} />
            {[profile.university, profile.degree, profile.year ? `Curso ${profile.year}` : null].filter(Boolean).join(" · ")}
          </p>
        )}

        {isOwn && (
          <p className="text-xs text-muted-light font-mono">
            Miembro desde {new Date(profile.created_at).toLocaleDateString("es-ES")}
          </p>
        )}
      </CardBody>
    </Card>
  );
}
