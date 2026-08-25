-- Exam 2.0 Digital Classroom tables
-- Safe to run on Supabase: creates missing tables, indexes, and RLS policies only.

create table if not exists public.exams (
  id uuid primary key default gen_random_uuid(),
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  exam_type text,
  difficulty text,
  duration_minutes integer not null default 60,
  total_marks numeric not null default 0,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'active', 'closed', 'archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  max_attempts integer not null default 1 check (max_attempts > 0),
  show_marks_immediately boolean not null default true,
  show_correct_answers boolean not null default true,
  allow_late_submission boolean not null default false,
  password text,
  exam_config_json jsonb not null default '{}'::jsonb,
  questions_json jsonb not null default '[]'::jsonb,
  source text not null default 'exam2',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists public.exam_results (
  id uuid primary key default gen_random_uuid(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  classroom_id uuid not null references public.classrooms(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  attempt_number integer not null default 1 check (attempt_number > 0),
  answers_json jsonb not null default '{}'::jsonb,
  score numeric not null default 0,
  max_score numeric not null default 0,
  percentage numeric not null default 0,
  grade text,
  status text not null default 'submitted' check (status in ('in_progress', 'submitted', 'reviewed')),
  breakdown_json jsonb not null default '[]'::jsonb,
  feedback_json jsonb not null default '{}'::jsonb,
  teacher_feedback text,
  started_at timestamptz,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_id, student_id, attempt_number)
);

create index if not exists exams_classroom_id_idx on public.exams(classroom_id);
create index if not exists exams_teacher_id_idx on public.exams(teacher_id);
create index if not exists exams_status_idx on public.exams(status);
create index if not exists exams_window_idx on public.exams(starts_at, ends_at);
create index if not exists exam_results_exam_id_idx on public.exam_results(exam_id);
create index if not exists exam_results_classroom_id_idx on public.exam_results(classroom_id);
create index if not exists exam_results_student_id_idx on public.exam_results(student_id);
create index if not exists exam_results_status_idx on public.exam_results(status);

alter table public.exams enable row level security;
alter table public.exam_results enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'exams' and policyname = 'Teachers manage exams for their classrooms') then
    create policy "Teachers manage exams for their classrooms"
      on public.exams
      for all
      using (
        exists (
          select 1 from public.classrooms c
          where c.id = exams.classroom_id
            and c.teacher_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.classrooms c
          where c.id = exams.classroom_id
            and c.teacher_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'exams' and policyname = 'Students read published classroom exams') then
    create policy "Students read published classroom exams"
      on public.exams
      for select
      using (
        status in ('scheduled', 'active', 'closed')
        and exists (
          select 1 from public.classroom_members cm
          where cm.classroom_id = exams.classroom_id
            and cm.profile_id = auth.uid()
            and cm.role = 'student'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'exam_results' and policyname = 'Students manage their own exam attempts') then
    create policy "Students manage their own exam attempts"
      on public.exam_results
      for all
      using (student_id = auth.uid())
      with check (
        student_id = auth.uid()
        and exists (
          select 1 from public.classroom_members cm
          where cm.classroom_id = exam_results.classroom_id
            and cm.profile_id = auth.uid()
            and cm.role = 'student'
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'exam_results' and policyname = 'Teachers review classroom exam attempts') then
    create policy "Teachers review classroom exam attempts"
      on public.exam_results
      for all
      using (
        exists (
          select 1 from public.classrooms c
          where c.id = exam_results.classroom_id
            and c.teacher_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.classrooms c
          where c.id = exam_results.classroom_id
            and c.teacher_id = auth.uid()
        )
      );
  end if;
end $$;
