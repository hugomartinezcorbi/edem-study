import { Badge } from "@/components/ui/Badge";
import { Card, CardBody } from "@/components/ui/Card";
import { LikeButton } from "@/components/projects/LikeButton";
import { DecideButtons } from "@/components/projects/DecideButtons";
import type { ProjectApplication } from "@/lib/types";

const STATUS_LABEL: Record<ProjectApplication["status"], string> = {
  pending: "En revisión",
  accepted: "En el equipo",
  rejected: "No aceptada",
};

export function ApplicationCard({
  application,
  isCreator,
  isOwnApplication,
}: {
  application: ProjectApplication;
  isCreator: boolean;
  isOwnApplication: boolean;
}) {
  return (
    <Card>
      <CardBody className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="font-medium">
            {application.applicant?.display_name}{" "}
            <span className="text-muted text-sm">@{application.applicant?.username}</span>
            {isOwnApplication && <span className="text-xs text-accent ml-1.5">(tú)</span>}
          </p>
          <Badge
            className={
              application.status === "accepted"
                ? "text-success bg-success/10"
                : application.status === "rejected"
                  ? "text-danger bg-danger/10"
                  : undefined
            }
          >
            {STATUS_LABEL[application.status]}
          </Badge>
        </div>
        <p className="text-sm text-muted whitespace-pre-wrap">{application.pitch}</p>
        <div className="flex items-center justify-between pt-1">
          <LikeButton
            applicationId={application.id}
            initialLikes={application.likes_count}
            initialLiked={!!application.my_like}
            disabled={isOwnApplication}
          />
          {isCreator && application.status === "pending" && <DecideButtons applicationId={application.id} />}
        </div>
      </CardBody>
    </Card>
  );
}
