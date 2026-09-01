import { createClient } from "@/lib/supabase/server";
import { getJoinedCommunities } from "@/lib/queries/community";
import { CommunitySidebar } from "@/components/community/CommunitySidebar";
import { redirect } from "next/navigation";

export default async function CommunityLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const communities = await getJoinedCommunities(supabase, user.id);

  return (
    <div className="flex flex-col lg:flex-row gap-6 -mt-2">
      <CommunitySidebar communities={communities} />
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  );
}
