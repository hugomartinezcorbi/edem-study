import { createClient } from "@/lib/supabase/server";
import { getSharedNotes, type NoteSort } from "@/lib/queries/shared-notes";
import { getMembership } from "@/lib/queries/community";
import { redirect } from "next/navigation";
import { NotesLibrary } from "@/components/shared-notes/NotesLibrary";

export default async function CommunityNotesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ sort?: string; tag?: string }>;
}) {
  const { id } = await params;
  const { sort, tag } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [notes, membership] = await Promise.all([
    getSharedNotes(supabase, id, { sort: (sort as NoteSort) ?? "recent", tag }),
    getMembership(supabase, id, user.id),
  ]);

  return <NotesLibrary communityId={id} notes={notes} isMember={!!membership} currentSort={sort ?? "recent"} />;
}
