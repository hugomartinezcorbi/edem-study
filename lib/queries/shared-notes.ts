import type { SupabaseClient } from "@supabase/supabase-js";
import type { NoteRating, SharedNote } from "@/lib/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DB = SupabaseClient<any, any, any>;

export type NoteSort = "recent" | "rating" | "downloads";

export async function getSharedNotes(
  db: DB,
  communityId: string,
  opts: { sort?: NoteSort; tag?: string; query?: string } = {}
): Promise<SharedNote[]> {
  let q = db.from("shared_notes").select("*, author:user_profiles(*)").eq("community_subject_id", communityId);
  if (opts.tag) q = q.contains("tags", [opts.tag]);
  if (opts.query) q = q.ilike("title", `%${opts.query}%`);

  if (opts.sort === "rating") q = q.order("rating_average", { ascending: false });
  else if (opts.sort === "downloads") q = q.order("download_count", { ascending: false });
  else q = q.order("created_at", { ascending: false });

  const { data } = await q.limit(60);
  return (data as SharedNote[]) ?? [];
}

export async function getSharedNote(db: DB, id: string, currentUserId?: string): Promise<SharedNote | null> {
  const { data } = await db.from("shared_notes").select("*, author:user_profiles(*)").eq("id", id).maybeSingle();
  if (!data) return null;
  const note = data as SharedNote;
  if (currentUserId) {
    const { data: rating } = await db
      .from("note_ratings")
      .select("rating")
      .eq("shared_note_id", id)
      .eq("user_id", currentUserId)
      .maybeSingle();
    note.my_rating = rating?.rating;
  }
  return note;
}

export async function getRatings(db: DB, noteId: string): Promise<NoteRating[]> {
  const { data } = await db
    .from("note_ratings")
    .select("*, author:user_profiles(*)")
    .eq("shared_note_id", noteId)
    .order("created_at", { ascending: false });
  return (data as NoteRating[]) ?? [];
}
