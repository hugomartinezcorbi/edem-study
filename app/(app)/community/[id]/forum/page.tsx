import { createClient } from "@/lib/supabase/server";
import { getPosts, type PostSort } from "@/lib/queries/forum";
import { getMembership } from "@/lib/queries/community";
import { redirect } from "next/navigation";
import { ForumFeed } from "@/components/forum/ForumFeed";

export default async function CommunityForumPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string; type?: string }>;
}) {
  const { id } = await params;
  const { sort, type } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [posts, membership] = await Promise.all([
    getPosts(supabase, id, {
      sort: (sort as PostSort) ?? "recent",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: type as any,
      currentUserId: user.id,
    }),
    getMembership(supabase, id, user.id),
  ]);

  return <ForumFeed communityId={id} posts={posts} isMember={!!membership} currentSort={sort ?? "recent"} currentType={type ?? ""} />;
}
