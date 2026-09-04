-- EDEM Study App — full schema
-- Run this in the Supabase SQL editor (or via `supabase db push`).

create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────────────
-- users (mirrors auth.users so we can join/reference from other tables)
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ─────────────────────────────────────────────────────────────────────────
-- subjects
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.subjects (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  name text not null,
  semester int not null check (semester in (1, 2)),
  ects int not null default 6,
  color text not null default '#3b82f6',
  icon text not null default '📚',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_subjects_user on public.subjects(user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- topics
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.topics (
  id uuid primary key default uuid_generate_v4(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  name text not null,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_topics_subject on public.topics(subject_id);

-- ─────────────────────────────────────────────────────────────────────────
-- documents
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.documents (
  id uuid primary key default uuid_generate_v4(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  user_id uuid not null references public.users(id) on delete cascade,
  filename text not null,
  file_url text not null,
  file_type text not null,
  extracted_text text,
  processed boolean not null default false,
  is_exam boolean not null default false,
  uploaded_at timestamptz not null default now()
);
create index if not exists idx_documents_subject on public.documents(subject_id);
create index if not exists idx_documents_user on public.documents(user_id);
create index if not exists idx_documents_exam on public.documents(subject_id, is_exam);

-- ─────────────────────────────────────────────────────────────────────────
-- notes — one row per subject, content grows over time
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.notes (
  id uuid primary key default uuid_generate_v4(),
  subject_id uuid not null unique references public.subjects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  content jsonb not null default '{}'::jsonb,
  version int not null default 1,
  last_updated timestamptz not null default now(),
  generated_from uuid[] not null default '{}'
);

-- ─────────────────────────────────────────────────────────────────────────
-- exam_insights — one row per subject, grows as past exams are uploaded.
-- Same "single growing page" pattern as notes, but distilled from real exams:
-- recurring topics, question phrasing style, difficulty profile. Used to
-- steer question generation and to flag which notes sections matter most.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.exam_insights (
  id uuid primary key default uuid_generate_v4(),
  subject_id uuid not null unique references public.subjects(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  content jsonb not null default '{}'::jsonb,
  version int not null default 1,
  last_updated timestamptz not null default now(),
  generated_from uuid[] not null default '{}'
);

-- ─────────────────────────────────────────────────────────────────────────
-- concepts
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.concepts (
  id uuid primary key default uuid_generate_v4(),
  subject_id uuid not null references public.subjects(id) on delete cascade,
  topic_id uuid references public.topics(id) on delete set null,
  title text not null,
  definition text not null,
  key_points text[] not null default '{}',
  examples text[] not null default '{}',
  source_document_ids uuid[] not null default '{}',
  mastery_level float not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_concepts_subject on public.concepts(subject_id);

-- ─────────────────────────────────────────────────────────────────────────
-- questions
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.questions (
  id uuid primary key default uuid_generate_v4(),
  concept_id uuid not null references public.concepts(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  question_text text not null,
  question_type text not null check (question_type in ('multiple_choice', 'true_false', 'short_answer', 'explain')),
  options jsonb,
  correct_answer text not null,
  explanation text not null default '',
  difficulty int not null default 2 check (difficulty between 1 and 5),
  times_asked int not null default 0,
  times_correct int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_questions_concept on public.questions(concept_id);
create index if not exists idx_questions_subject on public.questions(subject_id);

-- ─────────────────────────────────────────────────────────────────────────
-- study_sessions
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.study_sessions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  phase text not null default 'fallar' check (phase in ('fallar', 'estudiar', 'explicar', 'volver', 'completed')),
  total_questions int not null default 0,
  correct_answers int not null default 0,
  concepts_reviewed uuid[] not null default '{}',
  duration_minutes int
);
create index if not exists idx_sessions_user on public.study_sessions(user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- answers
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.answers (
  id uuid primary key default uuid_generate_v4(),
  session_id uuid not null references public.study_sessions(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  concept_id uuid not null references public.concepts(id) on delete cascade,
  phase text not null default 'fallar',
  user_answer text,
  is_correct boolean not null,
  time_spent_seconds int,
  answered_at timestamptz not null default now()
);
create index if not exists idx_answers_session on public.answers(session_id);

-- ─────────────────────────────────────────────────────────────────────────
-- spaced_repetition
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.spaced_repetition (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users(id) on delete cascade,
  concept_id uuid not null references public.concepts(id) on delete cascade,
  ease_factor float not null default 2.5,
  interval_days int not null default 1,
  repetitions int not null default 0,
  next_review date not null default current_date,
  last_reviewed timestamptz,
  unique (user_id, concept_id)
);
create index if not exists idx_sr_user_next on public.spaced_repetition(user_id, next_review);

-- ─────────────────────────────────────────────────────────────────────────
-- Row Level Security — every table, owner-only access
-- ─────────────────────────────────────────────────────────────────────────
alter table public.users enable row level security;
alter table public.subjects enable row level security;
alter table public.topics enable row level security;
alter table public.documents enable row level security;
alter table public.notes enable row level security;
alter table public.exam_insights enable row level security;
alter table public.concepts enable row level security;
alter table public.questions enable row level security;
alter table public.study_sessions enable row level security;
alter table public.answers enable row level security;
alter table public.spaced_repetition enable row level security;

create policy "users can read own row" on public.users for select using (auth.uid() = id);
create policy "users can update own row" on public.users for update using (auth.uid() = id);

create policy "own subjects" on public.subjects for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own topics" on public.topics for all using (
  exists (select 1 from public.subjects s where s.id = topics.subject_id and s.user_id = auth.uid())
) with check (
  exists (select 1 from public.subjects s where s.id = topics.subject_id and s.user_id = auth.uid())
);

create policy "own documents" on public.documents for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own notes" on public.notes for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own exam_insights" on public.exam_insights for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own concepts" on public.concepts for all using (
  exists (select 1 from public.subjects s where s.id = concepts.subject_id and s.user_id = auth.uid())
) with check (
  exists (select 1 from public.subjects s where s.id = concepts.subject_id and s.user_id = auth.uid())
);

create policy "own questions" on public.questions for all using (
  exists (select 1 from public.subjects s where s.id = questions.subject_id and s.user_id = auth.uid())
) with check (
  exists (select 1 from public.subjects s where s.id = questions.subject_id and s.user_id = auth.uid())
);

create policy "own sessions" on public.study_sessions for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "own answers" on public.answers for all using (
  exists (select 1 from public.study_sessions ss where ss.id = answers.session_id and ss.user_id = auth.uid())
) with check (
  exists (select 1 from public.study_sessions ss where ss.id = answers.session_id and ss.user_id = auth.uid())
);

create policy "own spaced_repetition" on public.spaced_repetition for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────────
-- Storage bucket for uploaded documents
-- ─────────────────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "own document files select" on storage.objects for select using (
  bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]
);
create policy "own document files insert" on storage.objects for insert with check (
  bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]
);
create policy "own document files delete" on storage.objects for delete using (
  bucket_id = 'documents' and auth.uid()::text = (storage.foldername(name))[1]
);

-- ─────────────────────────────────────────────────────────────────────────
-- Seed helper: call after a user signs up to preload their degree's Primer
-- Curso subjects (ADE or IGE — EDEM only offers these two right now).
-- Usage: select public.seed_edem_subjects('<user-uuid>', 'ADE');
-- ─────────────────────────────────────────────────────────────────────────
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

-- Thin wrapper so the app can call a degree-named RPC directly.
create or replace function public.seed_ige_subjects(p_user_id uuid)
returns void
language plpgsql
security definer set search_path = public
as $$
begin
  perform public.seed_edem_subjects(p_user_id, 'IGE');
end;
$$;
