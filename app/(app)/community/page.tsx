import { createClient } from "@/lib/supabase/server";
import { getJoinedCommunities, searchCommunities } from "@/lib/queries/community";
import { CommunityExplorer } from "@/components/community/CommunityExplorer";

export default async function CommunityExplorePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [joined, results] = await Promise.all([
    user ? getJoinedCommunities(supabase, user.id) : Promise.resolve([]),
    searchCommunities(supabase, q ?? ""),
  ]);

  const joinedIds = new Set(joined.map((c) => c.id));

  return <CommunityExplorer initialCommunities={results} joinedIds={[...joinedIds]} initialQuery={q ?? ""} />;
}
