import { createClient } from "@/lib/supabase/server";
import { getComments, getPost } from "@/lib/queries/forum";
import { notFound, redirect } from "next/navigation";
import { VoteButton } from "@/components/forum/VoteButton";
import { CommentThread } from "@/components/forum/CommentThread";
import { Card, CardBody } from "@/components/ui/Card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string; postId: string }>;
}) {
  const { postId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [post, comments] = await Promise.all([getPost(supabase, postId, user.id), getComments(supabase, postId)]);
  if (!post) notFound();

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardBody className="flex gap-4">
          <VoteButton postId={post.id} upvotes={post.upvotes} downvotes={post.downvotes} myVote={post.my_vote ?? null} />
          <div className="min-w-0 flex-1 space-y-2">
            <h1 className="text-xl font-heading font-bold">{post.title}</h1>
            <p className="text-xs text-muted">
              {post.author?.display_name} · {new Date(post.created_at).toLocaleDateString("es-ES")}
            </p>
            <div className="prose-notes text-sm">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{post.content}</ReactMarkdown>
            </div>
          </div>
        </CardBody>
      </Card>

      <CommentThread postId={postId} comments={comments} />
    </div>
  );
}
