-- EDEM Study App — IGE degree track + learning-based XP + degree-split ranking
-- Run this in the Supabase SQL editor AFTER the previous migrations.

-- ─────────────────────────────────────────────────────────────────────────
-- Track which degree a student is in (ADE or IGE), captured at signup.
-- ─────────────────────────────────────────────────────────────────────────
alter table public.user_profiles drop constraint if exists user_profiles_degree_check;
alter table public.user_profiles add constraint user_profiles_degree_check check (degree is null or degree in ('ADE', 'IGE'));

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

  insert into public.user_profiles (id, username, display_name, degree)
  values (
    new.id,
    final_username,
    coalesce(new.raw_user_meta_data->>'full_name', base_username),
    nullif(new.raw_user_meta_data->>'degree', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

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
  auth_degree text;
begin
  if auth.uid() is null then
    return;
  end if;
  if exists (select 1 from public.user_profiles where id = auth.uid()) then
    return;
  end if;

  select email, raw_user_meta_data->>'degree' into auth_email, auth_degree from auth.users where id = auth.uid();
  base_username := regexp_replace(split_part(coalesce(auth_email, 'user'), '@', 1), '[^a-zA-Z0-9_]', '', 'g');
  if base_username = '' then base_username := 'user'; end if;
  final_username := base_username;
  while exists (select 1 from public.user_profiles where username = final_username) loop
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;

  insert into public.user_profiles (id, username, display_name, degree)
  values (auth.uid(), final_username, base_username, nullif(auth_degree, ''))
  on conflict (id) do nothing;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- IGE curriculum (Grado en Ingeniería y Gestión Empresarial), mirrors
-- seed_edem_subjects but for the IGE track.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.seed_ige_subjects(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  if p_user_id is distinct from auth.uid() then
    raise exception 'not authorized to seed subjects for another user';
  end if;

  if exists (select 1 from public.subjects where user_id = p_user_id) then
    return; -- already seeded, never duplicate
  end if;

  insert into public.subjects (user_id, name, semester, ects, color, icon, active)
  values
    (p_user_id, 'Química', 1, 6, '#3b82f6', '🧪', true),
    (p_user_id, 'Física I', 1, 6, '#8b5cf6', '⚛️', true),
    (p_user_id, 'Empresa', 1, 6, '#10b981', '🏢', true),
    (p_user_id, 'Cálculo', 1, 6, '#f59e0b', '➗', true),
    (p_user_id, 'Computer Science', 1, 6, '#ef4444', '💻', true),
    (p_user_id, 'Física II', 2, 6, '#06b6d4', '⚛️', false),
    (p_user_id, 'Ecuaciones Diferenciales', 2, 4, '#6366f1', '📐', false),
    (p_user_id, 'Biología', 2, 6, '#ec4899', '🧬', false),
    (p_user_id, 'Álgebra', 2, 4, '#84cc16', '🔢', false),
    (p_user_id, 'Graphic Expression', 2, 4, '#f97316', '✏️', false),
    (p_user_id, 'Economía', 2, 6, '#14b8a6', '📈', false)
  on conflict do nothing;
end;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Learning-based XP: reward mastering concepts and finishing study
-- sessions, not time spent connected. Feeds the same reputation_score the
-- social module already uses, via adjust_reputation.
-- ─────────────────────────────────────────────────────────────────────────
create or replace function public.award_xp_concept_mastery()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  owner uuid;
begin
  if new.mastery_level >= 0.8 and old.mastery_level < 0.8 then
    select user_id into owner from public.subjects where id = new.subject_id;
    if owner is not null then
      -- Extra credit for turning around a concept that was genuinely struggling before.
      if old.mastery_level < 0.4 then
        perform public.adjust_reputation(owner, 25);
      else
        perform public.adjust_reputation(owner, 15);
      end if;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_concept_mastery_xp on public.concepts;
create trigger on_concept_mastery_xp
  after update of mastery_level on public.concepts
  for each row execute function public.award_xp_concept_mastery();

create or replace function public.award_xp_session_completed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  streak_yesterday boolean;
begin
  if new.phase = 'completed' and old.phase is distinct from 'completed' then
    perform public.adjust_reputation(new.user_id, 10);

    select exists (
      select 1 from public.study_sessions s
      where s.user_id = new.user_id
        and s.phase = 'completed'
        and s.id <> new.id
        and s.started_at::date = (new.started_at::date - interval '1 day')::date
    ) into streak_yesterday;

    if streak_yesterday then
      perform public.adjust_reputation(new.user_id, 5);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists on_study_session_completed_xp on public.study_sessions;
create trigger on_study_session_completed_xp
  after update of phase on public.study_sessions
  for each row execute function public.award_xp_session_completed();
