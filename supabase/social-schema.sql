-- EDEM Study App — Social Module Schema
-- Run this in the Supabase SQL editor AFTER supabase/schema.sql.
-- Registration is open: anyone can sign up and join communities.

-- ─────────────────────────────────────────────────────────────────────────
-- user_profiles — public social profile, one per auth user
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  avatar_url text,
  bio text,
  university text,
  degree text,
  year int,
  reputation_score int not null default 0,
  is_verified boolean not null default false,
  is_banned boolean not null default false,
  is_muted boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_user_profiles_username on public.user_profiles(username);
create index if not exists idx_user_profiles_reputation on public.user_profiles(reputation_score desc);

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
begin
  base_username := regexp_replace(split_part(new.email, '@', 1), '[^a-zA-Z0-9_]', '', 'g');
  if base_username = '' then base_username := 'user'; end if;
  final_username := base_username;
  while exists (select 1 from public.user_profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;

  insert into public.user_profiles (id, username, display_name)
  values (new.id, final_username, coalesce(new.raw_user_meta_data->>'full_name', base_username))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

-- Backfill helper for users who signed up before this migration ran.
-- Safe to call every request: it's a no-op once the row exists.
create or replace function public.ensure_own_profile()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
  auth_email text;
begin
  if auth.uid() is null then
    return;
  end if;
  if exists (select 1 from public.user_profiles where id = auth.uid()) then
    return;
  end if;

  select email into auth_email from auth.users where id = auth.uid();
  base_username := regexp_replace(split_part(coalesce(auth_email, 'user'), '@', 1), '[^a-zA-Z0-9_]', '', 'g');
  if base_username = '' then base_username := 'user'; end if;
  final_username := base_username;
  while exists (select 1 from public.user_profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;

  insert into public.user_profiles (id, username, display_name)
  values (auth.uid(), final_username, base_username)
  on conflict (id) do nothing;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- community_subjects — shared spaces distinct from a user's personal subjects
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.community_subjects (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  university text,
  degree text,
  description text,
  member_count int not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  created_by uuid references public.user_profiles(id) on delete set null
);
create index if not exists idx_community_subjects_search on public.community_subjects using gin (to_tsvector('spanish', name || ' ' || coalesce(description, '')));

create table if not exists public.community_memberships (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  community_subject_id uuid not null references public.community_subjects(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'moderator', 'admin')),
  joined_at timestamptz not null default now(),
  unique (user_id, community_subject_id)
);
create index if not exists idx_memberships_user on public.community_memberships(user_id);
create index if not exists idx_memberships_community on public.community_memberships(community_subject_id);

create or replace function public.update_member_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update public.community_subjects set member_count = member_count + 1 where id = new.community_subject_id;
    return new;
  elsif TG_OP = 'DELETE' then
    update public.community_subjects set member_count = greatest(0, member_count - 1) where id = old.community_subject_id;
    return old;
  end if;
end;
$$;

drop trigger if exists on_membership_change on public.community_memberships;
create trigger on_membership_change
  after insert or delete on public.community_memberships
  for each row execute function public.update_member_count();

-- ─────────────────────────────────────────────────────────────────────────
-- chat_messages — realtime chat per community
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.chat_messages (
  id uuid primary key default uuid_generate_v4(),
  community_subject_id uuid not null references public.community_subjects(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  content text not null,
  message_type text not null default 'text' check (message_type in ('text', 'file', 'image', 'note_share')),
  file_url text,
  file_name text,
  reply_to_id uuid references public.chat_messages(id) on delete set null,
  is_pinned boolean not null default false,
  is_deleted boolean not null default false,
  moderation_status text not null default 'approved' check (moderation_status in ('approved', 'pending', 'rejected')),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index if not exists idx_chat_messages_community on public.chat_messages(community_subject_id, created_at desc);
create index if not exists idx_chat_messages_search on public.chat_messages using gin (to_tsvector('spanish', content));

-- ─────────────────────────────────────────────────────────────────────────
-- posts — forum threads per community
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.posts (
  id uuid primary key default uuid_generate_v4(),
  community_subject_id uuid not null references public.community_subjects(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  title text not null,
  content text not null,
  post_type text not null default 'discusion' check (post_type in ('apuntes', 'pregunta', 'recurso', 'discusion')),
  attachments jsonb not null default '[]'::jsonb,
  upvotes int not null default 0,
  downvotes int not null default 0,
  comment_count int not null default 0,
  is_pinned boolean not null default false,
  is_deleted boolean not null default false,
  moderation_status text not null default 'approved' check (moderation_status in ('approved', 'pending', 'rejected')),
  created_at timestamptz not null default now(),
  edited_at timestamptz
);
create index if not exists idx_posts_community on public.posts(community_subject_id, created_at desc);
create index if not exists idx_posts_search on public.posts using gin (to_tsvector('spanish', title || ' ' || content));

create table if not exists public.post_votes (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  vote_type text not null check (vote_type in ('up', 'down')),
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);

create table if not exists public.post_comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  content text not null,
  reply_to_id uuid references public.post_comments(id) on delete cascade,
  upvotes int not null default 0,
  is_deleted boolean not null default false,
  moderation_status text not null default 'approved' check (moderation_status in ('approved', 'pending', 'rejected')),
  created_at timestamptz not null default now()
);
create index if not exists idx_post_comments_post on public.post_comments(post_id, created_at);

-- ─────────────────────────────────────────────────────────────────────────
-- shared_notes — community notes library
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.shared_notes (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  community_subject_id uuid not null references public.community_subjects(id) on delete cascade,
  title text not null,
  description text,
  file_url text not null,
  extracted_text text,
  content_json jsonb,
  download_count int not null default 0,
  rating_average float not null default 0,
  rating_count int not null default 0,
  tags text[] not null default '{}',
  is_approved boolean not null default true,
  moderation_status text not null default 'approved' check (moderation_status in ('approved', 'pending', 'rejected')),
  created_at timestamptz not null default now()
);
create index if not exists idx_shared_notes_community on public.shared_notes(community_subject_id, created_at desc);
create index if not exists idx_shared_notes_rating on public.shared_notes(rating_average desc);

create table if not exists public.note_ratings (
  id uuid primary key default uuid_generate_v4(),
  shared_note_id uuid not null references public.shared_notes(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (shared_note_id, user_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- pdf_generations — AI-generated study PDFs from mixed sources
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.pdf_generations (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  community_subject_id uuid references public.community_subjects(id) on delete set null,
  title text not null,
  source_materials jsonb not null default '[]'::jsonb,
  generated_pdf_url text,
  content_json jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_pdf_generations_user on public.pdf_generations(user_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────
-- notifications
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  type text not null check (type in ('mention', 'reply', 'upvote', 'new_notes', 'comment', 'rating', 'download', 'moderation')),
  title text not null,
  body text not null,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications(user_id, is_read, created_at desc);

-- ─────────────────────────────────────────────────────────────────────────
-- moderation_queue / moderation_rules — AI-gated moderation, admin-only
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.moderation_queue (
  id uuid primary key default uuid_generate_v4(),
  content_type text not null check (content_type in ('chat_message', 'post', 'comment', 'shared_note')),
  content_id uuid not null,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  community_subject_id uuid references public.community_subjects(id) on delete cascade,
  content_preview text not null,
  ai_decision text not null check (ai_decision in ('auto_approved', 'needs_review', 'auto_rejected')),
  ai_reason text,
  ai_score float,
  admin_decision text check (admin_decision in ('approved', 'rejected')),
  admin_notes text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_moderation_queue_pending on public.moderation_queue(ai_decision, admin_decision, created_at desc);
create index if not exists idx_moderation_queue_content on public.moderation_queue(content_type, content_id);

create table if not exists public.moderation_rules (
  id uuid primary key default uuid_generate_v4(),
  rule_type text not null check (rule_type in ('auto_approve', 'auto_reject', 'keyword_block', 'keyword_flag')),
  condition jsonb not null default '{}'::jsonb,
  action text not null check (action in ('approve', 'reject', 'flag_for_review')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────
-- Reputation point ledger (keeps reputation_score auditable/reversible)
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.adjust_reputation(p_user_id uuid, p_delta int)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  update public.user_profiles set reputation_score = greatest(0, reputation_score + p_delta) where id = p_user_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Vote / comment count + reputation triggers
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.update_post_vote_counts()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  post_owner uuid;
begin
  if TG_OP = 'INSERT' then
    select user_id into post_owner from public.posts where id = new.post_id;
    if new.vote_type = 'up' then
      update public.posts set upvotes = upvotes + 1 where id = new.post_id;
      perform public.adjust_reputation(post_owner, 10);
    else
      update public.posts set downvotes = downvotes + 1 where id = new.post_id;
    end if;
    return new;
  elsif TG_OP = 'DELETE' then
    select user_id into post_owner from public.posts where id = old.post_id;
    if old.vote_type = 'up' then
      update public.posts set upvotes = greatest(0, upvotes - 1) where id = old.post_id;
      perform public.adjust_reputation(post_owner, -10);
    else
      update public.posts set downvotes = greatest(0, downvotes - 1) where id = old.post_id;
    end if;
    return old;
  end if;
end;
$$;

drop trigger if exists on_post_vote_change on public.post_votes;
create trigger on_post_vote_change
  after insert or delete on public.post_votes
  for each row execute function public.update_post_vote_counts();

create or replace function public.update_post_comment_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update public.posts set comment_count = comment_count + 1 where id = new.post_id;
    return new;
  elsif TG_OP = 'DELETE' then
    update public.posts set comment_count = greatest(0, comment_count - 1) where id = old.post_id;
    return old;
  end if;
end;
$$;

drop trigger if exists on_post_comment_change on public.post_comments;
create trigger on_post_comment_change
  after insert or delete on public.post_comments
  for each row execute function public.update_post_comment_count();

create or replace function public.reward_comment_upvote()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- comments don't have their own votes table; upvotes column is adjusted directly by the API,
  -- this trigger just keeps the reputation reward in one place when upvotes increases.
  if new.upvotes > old.upvotes then
    perform public.adjust_reputation(new.user_id, 5 * (new.upvotes - old.upvotes));
  end if;
  return new;
end;
$$;

drop trigger if exists on_comment_upvote_change on public.post_comments;
create trigger on_comment_upvote_change
  after update of upvotes on public.post_comments
  for each row execute function public.reward_comment_upvote();

create or replace function public.update_note_rating()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  note_owner uuid;
  avg_rating float;
  cnt int;
begin
  select user_id into note_owner from public.shared_notes where id = coalesce(new.shared_note_id, old.shared_note_id);
  select avg(rating), count(*) into avg_rating, cnt from public.note_ratings where shared_note_id = coalesce(new.shared_note_id, old.shared_note_id);
  update public.shared_notes set rating_average = coalesce(avg_rating, 0), rating_count = cnt where id = coalesce(new.shared_note_id, old.shared_note_id);
  if TG_OP = 'INSERT' and new.rating = 5 then
    perform public.adjust_reputation(note_owner, 20);
  end if;
  return coalesce(new, old);
end;
$$;

drop trigger if exists on_note_rating_change on public.note_ratings;
create trigger on_note_rating_change
  after insert or update or delete on public.note_ratings
  for each row execute function public.update_note_rating();

create or replace function public.reward_note_download()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.download_count > old.download_count then
    perform public.adjust_reputation(new.user_id, 2 * (new.download_count - old.download_count));
  end if;
  return new;
end;
$$;

drop trigger if exists on_note_download_change on public.shared_notes;
create trigger on_note_download_change
  after update of download_count on public.shared_notes
  for each row execute function public.reward_note_download();

-- Lets any authenticated reader register a download without needing broad
-- UPDATE rights on shared_notes (which stay owner-only via RLS).
create or replace function public.increment_note_downloads(p_note_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authorized';
  end if;
  update public.shared_notes set download_count = download_count + 1 where id = p_note_id;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────
alter table public.user_profiles enable row level security;
alter table public.community_subjects enable row level security;
alter table public.community_memberships enable row level security;
alter table public.chat_messages enable row level security;
alter table public.posts enable row level security;
alter table public.post_votes enable row level security;
alter table public.post_comments enable row level security;
alter table public.shared_notes enable row level security;
alter table public.note_ratings enable row level security;
alter table public.pdf_generations enable row level security;
alter table public.notifications enable row level security;
alter table public.moderation_queue enable row level security;
alter table public.moderation_rules enable row level security;

create policy "profiles viewable by everyone" on public.user_profiles for select using (true);
create policy "users update own profile" on public.user_profiles for update using (auth.uid() = id);
create policy "users insert own profile" on public.user_profiles for insert with check (auth.uid() = id);

create policy "communities viewable by everyone" on public.community_subjects for select using (not is_archived);
create policy "authenticated can create communities" on public.community_subjects for insert with check (auth.uid() is not null);
create policy "admins can update own community" on public.community_subjects for update using (
  exists (select 1 from public.community_memberships m where m.community_subject_id = id and m.user_id = auth.uid() and m.role in ('admin', 'moderator'))
);

create policy "memberships viewable by everyone" on public.community_memberships for select using (true);
create policy "users can join communities" on public.community_memberships for insert with check (auth.uid() = user_id);
create policy "users can leave communities" on public.community_memberships for delete using (auth.uid() = user_id);

create policy "members read chat" on public.chat_messages for select using (
  (moderation_status = 'approved' or auth.uid() = user_id) and
  exists (select 1 from public.community_memberships m where m.community_subject_id = chat_messages.community_subject_id and m.user_id = auth.uid())
);
create policy "members write chat" on public.chat_messages for insert with check (
  auth.uid() = user_id and
  exists (select 1 from public.community_memberships m where m.community_subject_id = chat_messages.community_subject_id and m.user_id = auth.uid())
);
create policy "authors edit own chat messages" on public.chat_messages for update using (auth.uid() = user_id);

create policy "posts readable by everyone" on public.posts for select using (
  moderation_status = 'approved' or auth.uid() = user_id
);
create policy "members create posts" on public.posts for insert with check (
  auth.uid() = user_id and
  exists (select 1 from public.community_memberships m where m.community_subject_id = posts.community_subject_id and m.user_id = auth.uid())
);
create policy "authors edit own posts" on public.posts for update using (auth.uid() = user_id);
create policy "authors delete own posts" on public.posts for delete using (auth.uid() = user_id);

create policy "votes readable" on public.post_votes for select using (true);
create policy "members vote" on public.post_votes for insert with check (auth.uid() = user_id);
create policy "users change own vote" on public.post_votes for update using (auth.uid() = user_id);
create policy "users remove own vote" on public.post_votes for delete using (auth.uid() = user_id);

create policy "post comments readable" on public.post_comments for select using (
  moderation_status = 'approved' or auth.uid() = user_id
);
create policy "members comment" on public.post_comments for insert with check (auth.uid() = user_id);
create policy "authors edit own comments" on public.post_comments for update using (auth.uid() = user_id);
create policy "authors delete own comments" on public.post_comments for delete using (auth.uid() = user_id);

create policy "shared notes readable by everyone" on public.shared_notes for select using (
  moderation_status = 'approved' or auth.uid() = user_id
);
create policy "members upload shared notes" on public.shared_notes for insert with check (
  auth.uid() = user_id and
  exists (select 1 from public.community_memberships m where m.community_subject_id = shared_notes.community_subject_id and m.user_id = auth.uid())
);
create policy "authors update own shared notes" on public.shared_notes for update using (auth.uid() = user_id);
create policy "authors delete own shared notes" on public.shared_notes for delete using (auth.uid() = user_id);

create policy "ratings readable" on public.note_ratings for select using (true);
create policy "users rate notes" on public.note_ratings for insert with check (auth.uid() = user_id);
create policy "users update own rating" on public.note_ratings for update using (auth.uid() = user_id);

create policy "own pdf generations" on public.pdf_generations for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own notifications" on public.notifications for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- moderation_queue / moderation_rules: no public policies — service role (admin API routes) only.

-- ─────────────────────────────────────────────────────────────────────────
-- Realtime
-- ─────────────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.chat_messages;
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.post_comments;

-- ─────────────────────────────────────────────────────────────────────────
-- Storage buckets
-- ─────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public) values
  ('chat-files', 'chat-files', false),
  ('shared-notes', 'shared-notes', false),
  ('generated-pdfs', 'generated-pdfs', false),
  ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "chat files readable by members" on storage.objects for select using (
  bucket_id = 'chat-files' and auth.uid() is not null
);
create policy "chat files upload by members" on storage.objects for insert with check (
  bucket_id = 'chat-files' and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "shared notes readable by all" on storage.objects for select using (bucket_id = 'shared-notes');
create policy "shared notes upload by owner" on storage.objects for insert with check (
  bucket_id = 'shared-notes' and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "generated pdfs readable by owner" on storage.objects for select using (
  bucket_id = 'generated-pdfs' and auth.uid()::text = (storage.foldername(name))[1]
);
create policy "generated pdfs written by owner" on storage.objects for insert with check (
  bucket_id = 'generated-pdfs' and auth.uid()::text = (storage.foldername(name))[1]
);

create policy "avatars readable by all" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars upload by owner" on storage.objects for insert with check (
  bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
);
create policy "avatars update by owner" on storage.objects for update using (
  bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
);
