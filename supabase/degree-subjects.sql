-- EDEM Study App — Degree-aware subject seeding (ADE vs IGE)
-- Run this in the Supabase SQL editor AFTER schema.sql, social-schema.sql, projects-schema.sql, simplify-chat.sql.

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

drop function if exists public.seed_edem_subjects(uuid);

create or replace function public.seed_edem_subjects(p_user_id uuid, p_degree text default 'ADE')
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

  if p_degree = 'IGE' then
    insert into public.subjects (user_id, name, semester, ects, color, icon, active)
    values
      (p_user_id, 'Química', 1, 6, '#3b82f6', '🧪', true),
      (p_user_id, 'Física I', 1, 6, '#8b5cf6', '⚛️', true),
      (p_user_id, 'Empresa', 1, 6, '#10b981', '🏢', true),
      (p_user_id, 'Cálculo', 1, 6, '#f59e0b', '📐', true),
      (p_user_id, 'Computer Science', 1, 6, '#ef4444', '💻', true),
      (p_user_id, 'Física II', 2, 6, '#06b6d4', '⚛️', false),
      (p_user_id, 'Ecuaciones Diferenciales', 2, 4, '#6366f1', '🧮', false),
      (p_user_id, 'Biología', 2, 6, '#ec4899', '🧬', false),
      (p_user_id, 'Álgebra', 2, 4, '#84cc16', '➗', false),
      (p_user_id, 'Graphic Expression', 2, 4, '#14b8a6', '✏️', false),
      (p_user_id, 'Economía', 2, 6, '#f97316', '📈', false)
    on conflict do nothing;
  else
    insert into public.subjects (user_id, name, semester, ects, color, icon, active)
    values
      (p_user_id, 'Introduction to Business Management Studies', 1, 6, '#3b82f6', '🏢', true),
      (p_user_id, 'Fundamentos de la Dirección de Empresas', 1, 6, '#8b5cf6', '📊', true),
      (p_user_id, 'Financial Accounting', 1, 6, '#10b981', '💰', true),
      (p_user_id, 'Matemáticas I', 1, 6, '#f59e0b', '📐', true),
      (p_user_id, 'Introducción a la Economía', 1, 6, '#ef4444', '📈', true),
      (p_user_id, 'Historia Económica y de la Empresa', 2, 6, '#06b6d4', '🏛️', false),
      (p_user_id, 'Derecho Mercantil', 2, 6, '#6366f1', '⚖️', false),
      (p_user_id, 'Basic Statistics', 2, 6, '#ec4899', '📉', false),
      (p_user_id, 'Microeconomía', 2, 6, '#84cc16', '🔬', false),
      (p_user_id, 'Matemáticas II', 2, 6, '#f97316', '➗', false)
    on conflict do nothing;
  end if;
end;
$$;
