alter table public.products
  add column if not exists trashed_at timestamptz,
  add column if not exists status_before_trash text;

alter table public.products drop constraint if exists products_status_check;
alter table public.products
  add constraint products_status_check
  check (status = any (array['draft', 'active', 'sold', 'archived', 'trash']::text[]));

create index if not exists products_seller_trash_idx
  on public.products (seller_id, trashed_at desc)
  where status = 'trash';

create table if not exists public.seller_reviews (
  id uuid primary key default extensions.gen_random_uuid(),
  seller_id uuid not null references public.profiles (id) on delete cascade,
  reviewer_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  review_text text not null default '' check (char_length(review_text) <= 1000),
  created_at timestamptz not null default now(),
  unique (reviewer_id, product_id),
  check (seller_id <> reviewer_id)
);

alter table public.seller_reviews enable row level security;
grant select on public.seller_reviews to anon, authenticated;
grant insert on public.seller_reviews to authenticated;

create policy "seller_reviews_public_read"
  on public.seller_reviews for select to anon, authenticated using (true);

create policy "seller_reviews_buyer_insert"
  on public.seller_reviews for insert to authenticated
  with check (
    reviewer_id = (select auth.uid())
    and exists (
      select 1
      from public.products p
      join public.conversations c on c.product_id = p.id
      where p.id = seller_reviews.product_id
        and p.seller_id = seller_reviews.seller_id
        and p.status = 'sold'
        and c.seller_id = seller_reviews.seller_id
        and c.buyer_id = (select auth.uid())
    )
  );

create index if not exists seller_reviews_seller_created_idx
  on public.seller_reviews (seller_id, created_at desc);

create or replace function public.purge_expired_product_trash()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_deleted_count bigint;
begin
  delete from public.products
  where status = 'trash'
    and trashed_at <= now() - interval '3 days';

  get diagnostics v_deleted_count = row_count;
  return v_deleted_count;
end;
$$;

revoke all on function public.purge_expired_product_trash() from public, anon, authenticated;

create extension if not exists pg_cron with schema pg_catalog;
grant usage on schema cron to postgres;
grant all privileges on all tables in schema cron to postgres;

select cron.unschedule(jobid)
from cron.job
where jobname = 'purge-expired-product-trash';

select cron.schedule(
  'purge-expired-product-trash',
  '*/10 * * * *',
  'select public.purge_expired_product_trash();'
);

notify pgrst, 'reload schema';
