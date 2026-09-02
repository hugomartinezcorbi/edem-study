import { createClient } from "@/lib/supabase/server";
import { getRatings, getSharedNote } from "@/lib/queries/shared-notes";
import { notFound, redirect } from "next/navigation";
import { NoteDetail } from "@/components/shared-notes/NoteDetail";

export default async function NoteDetailPage({
  params,
}: {
  params: Promise<{ id: string; noteId: string }>;
}) {
  const { noteId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const [note, ratings] = await Promise.all([getSharedNote(supabase, noteId, user.id), getRatings(supabase, noteId)]);
  if (!note) notFound();

  return <NoteDetail note={note} ratings={ratings} myRating={note.my_rating ?? 0} />;
}
