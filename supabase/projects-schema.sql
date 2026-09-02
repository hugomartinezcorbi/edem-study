-- EDEM Study App — Projects module + notification RLS fix
-- Run this in the Supabase SQL editor AFTER supabase/schema.sql and supabase/social-schema.sql.

-- ─────────────────────────────────────────────────────────────────────────
-- Fix: notifications RLS only ever allowed auth.uid() = user_id, but every
-- notify() call in the app writes to a DIFFERENT user (the post owner, the
-- applicant, etc.) using the acting user's own session — so those inserts
-- were being silently rejected the whole time. This RPC lets any
-- authenticated user create a notification for someone else, the same way
-- adjust_reputation() already bypasses RLS for reputation updates.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.create_notification(
  p_user_id uuid, p_type text, p_title text, p_body text, p_link text default null
)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authorized';
  end if;
  insert into public.notifications (user_id, type, title, body, link)
  values (p_user_id, p_type, p_title, p_body, p_link);
end;
$$;

alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (
  type in ('mention', 'reply', 'upvote', 'new_notes', 'comment', 'rating', 'download', 'moderation', 'project_application', 'project_decision')
);

alter table public.moderation_queue drop constraint if exists moderation_queue_content_type_check;
alter table public.moderation_queue add constraint moderation_queue_content_type_check check (
  content_type in ('chat_message', 'post', 'comment', 'shared_note', 'project', 'project_application')
);

-- ─────────────────────────────────────────────────────────────────────────
-- projects — student startup/side-project postings, open for applications
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.projects (
  id uuid primary key default uuid_generate_v4(),
  creator_id uuid not null references public.user_profiles(id) on delete cascade,
  title text not null,
  tagline text not null,
  description text not null,
  category text not null default 'proyecto' check (category in ('startup', 'app', 'proyecto', 'investigacion', 'otro')),
  looking_for text[] not null default '{}',
  status text not null default 'open' check (status in ('open', 'closed')),
  member_count int not null default 1,
  applications_count int not null default 0,
  moderation_status text not null default 'approved' check (moderation_status in ('approved', 'pending', 'rejected')),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_projects_created on public.projects(created_at desc);
create index if not exists idx_projects_search on public.projects using gin (to_tsvector('spanish', title || ' ' || tagline || ' ' || description));

create table if not exists public.project_applications (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid not null references public.projects(id) on delete cascade,
  applicant_id uuid not null references public.user_profiles(id) on delete cascade,
  pitch text not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  likes_count int not null default 0,
  moderation_status text not null default 'approved' check (moderation_status in ('approved', 'pending', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz,
  unique (project_id, applicant_id)
);
create index if not exists idx_project_applications_ranking on public.project_applications(project_id, status, likes_count desc, created_at desc);

create table if not exists public.project_application_likes (
  id uuid primary key default uuid_generate_v4(),
  application_id uuid not null references public.project_applications(id) on delete cascade,
  user_id uuid not null references public.user_profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (application_id, user_id)
);

-- ─────────────────────────────────────────────────────────────────────────
-- Counters + reputation rewards
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.update_project_applications_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    update public.projects set applications_count = applications_count + 1 where id = new.project_id;
    return new;
  elsif TG_OP = 'DELETE' then
    update public.projects set applications_count = greatest(0, applications_count - 1) where id = old.project_id;
    return old;
  end if;
end;
$$;

drop trigger if exists on_project_application_change on public.project_applications;
create trigger on_project_application_change
  after insert or delete on public.project_applications
  for each row execute function public.update_project_applications_count();

create or replace function public.handle_project_application_decision()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status = 'accepted' and old.status is distinct from 'accepted' then
    update public.projects set member_count = member_count + 1 where id = new.project_id;
    perform public.adjust_reputation(new.applicant_id, 30);
    new.decided_at = now();
  elsif new.status = 'rejected' and old.status is distinct from 'rejected' then
    new.decided_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists on_project_application_decision on public.project_applications;
create trigger on_project_application_decision
  before update of status on public.project_applications
  for each row execute function public.handle_project_application_decision();

-- The "creators decide on applications" RLS policy below only has a USING
-- clause (which Postgres also applies as the implicit WITH CHECK), so it lets
-- a project creator UPDATE any column on an application to their own
-- project, not just status — e.g. rewriting an applicant's pitch via a raw
-- PostgREST request. This trigger closes that gap: only status (and the
-- decided_at the trigger above sets) may actually change.
create or replace function public.guard_project_application_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Depth > 1 means this UPDATE was itself fired by another trigger (e.g. the
  -- likes-count maintenance trigger below reacting to a like insert/delete) —
  -- trust those. Only a direct top-level UPDATE (depth 1, the RLS-checked
  -- client statement) needs to be restricted to status-only changes.
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if new.project_id is distinct from old.project_id
     or new.applicant_id is distinct from old.applicant_id
     or new.pitch is distinct from old.pitch
     or new.likes_count is distinct from old.likes_count
     or new.moderation_status is distinct from old.moderation_status
     or new.created_at is distinct from old.created_at then
    raise exception 'only the application status may be changed this way';
  end if;
  return new;
end;
$$;

drop trigger if exists on_project_application_update_guard on public.project_applications;
create trigger on_project_application_update_guard
  before update on public.project_applications
  for each row execute function public.guard_project_application_update();

create or replace function public.update_project_application_likes_count()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  applicant uuid;
begin
  if TG_OP = 'INSERT' then
    select applicant_id into applicant from public.project_applications where id = new.application_id;
    update public.project_applications set likes_count = likes_count + 1 where id = new.application_id;
    perform public.adjust_reputation(applicant, 3);
    return new;
  elsif TG_OP = 'DELETE' then
    select applicant_id into applicant from public.project_applications where id = old.application_id;
    update public.project_applications set likes_count = greatest(0, likes_count - 1) where id = old.application_id;
    perform public.adjust_reputation(applicant, -3);
    return old;
  end if;
end;
$$;

drop trigger if exists on_project_application_like_change on public.project_application_likes;
create trigger on_project_application_like_change
  after insert or delete on public.project_application_likes
  for each row execute function public.update_project_application_likes_count();

-- Belt-and-suspenders alongside the API-level check: nobody can like their own pitch.
create or replace function public.prevent_self_like_application()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if exists (select 1 from public.project_applications where id = new.application_id and applicant_id = new.user_id) then
    raise exception 'cannot like your own application';
  end if;
  return new;
end;
$$;

drop trigger if exists on_project_application_like_guard on public.project_application_likes;
create trigger on_project_application_like_guard
  before insert on public.project_application_likes
  for each row execute function public.prevent_self_like_application();

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────
alter table public.projects enable row level security;
alter table public.project_applications enable row level security;
alter table public.project_application_likes enable row level security;

-- Same reasoning as the application update guard above: the creator-update
-- policy only has a USING clause, so lock down which columns it may touch.
create or replace function public.guard_project_update()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- Same reasoning as guard_project_application_update: allow cascaded
  -- updates from the applications_count/member_count maintenance triggers,
  -- only restrict a direct top-level UPDATE on this table.
  if pg_trigger_depth() > 1 then
    return new;
  end if;
  if new.creator_id is distinct from old.creator_id
     or new.member_count is distinct from old.member_count
     or new.applications_count is distinct from old.applications_count
     or new.moderation_status is distinct from old.moderation_status
     or new.is_deleted is distinct from old.is_deleted
     or new.created_at is distinct from old.created_at then
    raise exception 'not allowed to change this field';
  end if;
  return new;
end;
$$;

drop trigger if exists on_project_update_guard on public.projects;
create trigger on_project_update_guard
  before update on public.projects
  for each row execute function public.guard_project_update();

create policy "projects readable by everyone" on public.projects for select using (
  (moderation_status = 'approved' and not is_deleted) or auth.uid() = creator_id
);
create policy "authenticated users create projects" on public.projects for insert with check (auth.uid() = creator_id);
create policy "creators update own projects" on public.projects for update using (auth.uid() = creator_id);
create policy "creators delete own projects" on public.projects for delete using (auth.uid() = creator_id);

create policy "applications readable by everyone" on public.project_applications for select using (
  moderation_status = 'approved' or auth.uid() = applicant_id or
  exists (select 1 from public.projects p where p.id = project_id and p.creator_id = auth.uid())
);
create policy "authenticated users apply" on public.project_applications for insert with check (auth.uid() = applicant_id);
create policy "creators decide on applications" on public.project_applications for update using (
  exists (select 1 from public.projects p where p.id = project_id and p.creator_id = auth.uid())
);
create policy "applicants withdraw own application" on public.project_applications for delete using (auth.uid() = applicant_id);

create policy "application likes readable by everyone" on public.project_application_likes for select using (true);
create policy "authenticated users like applications" on public.project_application_likes for insert with check (auth.uid() = user_id);
create policy "users remove own like" on public.project_application_likes for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Realtime (live application/like updates on the project detail page)
-- ─────────────────────────────────────────────────────────────────────────
alter publication supabase_realtime add table public.project_applications;
