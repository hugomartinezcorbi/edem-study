-- MI EDEM — user requests inbox + larger storage limits
-- Run in the Supabase SQL editor after supabase/projects-schema.sql.

-- ─────────────────────────────────────────────────────────────────────────
-- requests — anything a student wants to send straight to the admin:
-- suggestions, bug reports, help. Only the author and the admin (service
-- role, which bypasses RLS) ever read a row.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.requests (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  category text not null default 'sugerencia' check (category in ('sugerencia', 'error', 'ayuda', 'otro')),
  message text not null,
  status text not null default 'open' check (status in ('open', 'done')),
  admin_reply text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists idx_requests_status_created on public.requests(status, created_at desc);
create index if not exists idx_requests_user on public.requests(user_id, created_at desc);

alter table public.requests enable row level security;

drop policy if exists "own requests readable" on public.requests;
create policy "own requests readable" on public.requests
  for select using (auth.uid() = user_id);

drop policy if exists "own requests insertable" on public.requests;
create policy "own requests insertable" on public.requests
  for insert with check (auth.uid() = user_id);

-- A request is a message to the admin: once sent, the author cannot rewrite or
-- delete it, and only the admin (service role) can change its status or reply.

-- The admin gets a notification for every new request, and the author gets one
-- back when it is answered.
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (
  type in ('mention', 'reply', 'upvote', 'new_notes', 'comment', 'rating', 'download', 'moderation',
           'project_application', 'project_decision', 'request', 'request_reply')
);

-- ─────────────────────────────────────────────────────────────────────────
-- Storage capacity: raise the per-file ceilings. The total quota is a
-- Supabase plan setting, but these caps are what actually reject a file.
-- ─────────────────────────────────────────────────────────────────────────
update storage.buckets set file_size_limit = 104857600 where id = 'documents';   -- 100 MB
update storage.buckets set file_size_limit = 52428800  where id = 'chat-files';  --  50 MB
update storage.buckets set file_size_limit = 5242880   where id = 'avatars';     --   5 MB
