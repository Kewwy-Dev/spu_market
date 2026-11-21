-- Support multiple images (up to 5) on support_reports
alter table public.support_reports
  add column if not exists image_urls jsonb not null default '[]'::jsonb;

comment on column public.support_reports.image_urls is 'Array of up to 5 uploaded screenshot URLs for this support report';
