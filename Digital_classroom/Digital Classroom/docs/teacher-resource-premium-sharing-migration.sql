-- Metadata sharing support for Premium Learning Library resources.
-- This keeps the original teacher resource row and publishes it by metadata.

alter table public.submissions
add column if not exists is_deleted boolean not null default false;

alter table public.submissions
add column if not exists deleted_at timestamptz;

alter table public.submissions
add column if not exists updated_at timestamptz default now();

alter table public.submissions
add column if not exists shared_to_premium boolean not null default false;

alter table public.submissions
add column if not exists premium_shared_at timestamptz;

alter table public.submissions
add column if not exists premium_status text default 'draft';

alter table public.submissions
add column if not exists premium_library_category text;

create index if not exists idx_submissions_premium_library
on public.submissions (
  shared_to_premium,
  premium_status,
  is_deleted,
  premium_shared_at desc
)
where shared_to_premium is true;
