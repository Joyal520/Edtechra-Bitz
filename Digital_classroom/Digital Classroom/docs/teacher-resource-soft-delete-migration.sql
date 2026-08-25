-- Soft-delete support for Teacher Digital Classroom resources.
-- Apply this before using Delete Resource in My Teaching Resources.

alter table public.submissions
add column if not exists is_deleted boolean not null default false;

alter table public.submissions
add column if not exists deleted_at timestamptz;

alter table public.submissions
add column if not exists updated_at timestamptz default now();

create index if not exists idx_submissions_teacher_resources_not_deleted
on public.submissions (
  author_id,
  teacher_id,
  owner_role,
  resource_purpose,
  upload_context,
  source,
  classroom_id,
  created_at desc
)
where is_deleted is false;
