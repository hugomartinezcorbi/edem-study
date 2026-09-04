-- EDEM Study App — Simplify social layer to a single global chat + Projects
-- Run this in the Supabase SQL editor AFTER schema.sql, social-schema.sql and projects-schema.sql.
-- Communities/forum/shared-notes/PDF-generator app code was removed; their tables are
-- left in place (harmless, unused) rather than dropped, to avoid a destructive migration.

alter table public.chat_messages alter column community_subject_id drop not null;

drop policy if exists "members read chat" on public.chat_messages;
create policy "read chat" on public.chat_messages for select using (
  (moderation_status = 'approved' or auth.uid() = user_id) and
  (
    community_subject_id is null
    or exists (
      select 1 from public.community_memberships m
      where m.community_subject_id = chat_messages.community_subject_id and m.user_id = auth.uid()
    )
  )
);

drop policy if exists "members write chat" on public.chat_messages;
create policy "write chat" on public.chat_messages for insert with check (
  auth.uid() = user_id and
  (
    community_subject_id is null
    or exists (
      select 1 from public.community_memberships m
      where m.community_subject_id = chat_messages.community_subject_id and m.user_id = auth.uid()
    )
  )
);
