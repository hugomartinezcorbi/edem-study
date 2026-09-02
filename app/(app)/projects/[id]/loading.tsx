import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-6 w-24" />
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-4 w-64" />
      </div>
      <Skeleton className="h-32 rounded-2xl" />
      <div className="space-y-3">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-24 rounded-2xl" />
        <Skeleton className="h-24 rounded-2xl" />
      </div>
    </div>
  );
}
