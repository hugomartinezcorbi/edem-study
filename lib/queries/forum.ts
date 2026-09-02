import type { SupabaseClient } from "@supabase/supabase-js";
import type { Post, PostComment, PostType } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

export type PostSort = "recent" | "top" | "comments";

export async function getPosts(
  db: DB,
  communityId: string,
  opts: { sort?: PostSort; type?: PostType; currentUserId?: string; query?: string } = {}
): Promise<Post[]> {
  let q = db
    .from("posts")
    .select("*, author:user_profiles(*)")
    .eq("community_subject_id", communityId)
    .eq("is_deleted", false);

  if (opts.type) q = q.eq("post_type", opts.type);
  if (opts.query) q = q.ilike("title", `%${opts.query}%`);

  if (opts.sort === "top") q = q.order("upvotes", { ascending: false });
  else if (opts.sort === "comments") q = q.order("comment_count", { ascending: false });
  else q = q.order("created_at", { ascending: false });

  q = q.order("is_pinned", { ascending: false });

  const { data } = await q.limit(50);
  const posts = (data as Post[]) ?? [];

  if (opts.currentUserId && posts.length > 0) {
    const { data: votes } = await db
      .from("post_votes")
      .select("post_id, vote_type")
      .eq("user_id", opts.currentUserId)
      .in(
        "post_id",
        posts.map((p) => p.id)
      );
    const voteMap = new Map((votes ?? []).map((v) => [v.post_id, v.vote_type]));
    for (const post of posts) post.my_vote = (voteMap.get(post.id) as "up" | "down" | undefined) ?? null;
  }

  return posts;
}

export async function getPost(db: DB, postId: string, currentUserId?: string): Promise<Post | null> {
  const { data } = await db.from("posts").select("*, author:user_profiles(*)").eq("id", postId).maybeSingle();
  if (!data) return null;
  const post = data as Post;
  if (currentUserId) {
    const { data: vote } = await db
      .from("post_votes")
      .select("vote_type")
      .eq("post_id", postId)
      .eq("user_id", currentUserId)
      .maybeSingle();
    post.my_vote = (vote?.vote_type as "up" | "down" | undefined) ?? null;
  }
  return post;
}

export async function getComments(db: DB, postId: string): Promise<PostComment[]> {
  const { data } = await db
    .from("post_comments")
    .select("*, author:user_profiles(*)")
    .eq("post_id", postId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: true });

  const flat = (data as PostComment[]) ?? [];
  const byId = new Map(flat.map((c) => [c.id, { ...c, replies: [] as PostComment[] }]));
  const roots: PostComment[] = [];
  for (const comment of byId.values()) {
    if (comment.reply_to_id && byId.has(comment.reply_to_id)) {
      byId.get(comment.reply_to_id)!.replies!.push(comment);
    } else {
      roots.push(comment);
    }
  }
  return roots;
}
