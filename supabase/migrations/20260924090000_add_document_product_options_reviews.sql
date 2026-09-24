alter table public.documents
  add column if not exists product_type text not null default 'book',
  add column if not exists download_enabled boolean not null default true;

create table if not exists public.document_variants (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  label text not null,
  price numeric(12,2) not null default 0 check (price >= 0),
  enabled boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (document_id, label)
);

create index if not exists document_variants_document_idx
  on public.document_variants(document_id, sort_order);

create table if not exists public.document_images (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  variant_id uuid null references public.document_variants(id) on delete cascade,
  image_path text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists document_images_document_idx
  on public.document_images(document_id, sort_order);
create index if not exists document_images_variant_idx
  on public.document_images(variant_id, sort_order);

create table if not exists public.document_reviews (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents(id) on delete cascade,
  name text not null,
  rating integer not null default 5 check (rating between 1 and 5),
  comment text not null,
  approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_reviews_name_valid check (
    char_length(btrim(name)) between 1 and 80
    and name !~ E'[\\u0000-\\u001F\\u007F]'
    and name !~ '<[^>]*>'
    and name !~* '(https?://|www\\.|[[:alnum:]_-]+\\.[[:alpha:]]{2,})'
  ),
  constraint document_reviews_comment_valid check (
    char_length(btrim(comment)) between 1 and 500
    and comment !~ E'[\\u0000-\\u001F\\u007F]'
    and comment !~ '<[^>]*>'
    and comment !~* '(https?://|www\\.|javascript:|data:|[[:alnum:]_-]+\\.[[:alpha:]]{2,})'
  )
);

create index if not exists document_reviews_document_idx
  on public.document_reviews(document_id, approved, created_at desc);

alter table public.document_variants enable row level security;
alter table public.document_images enable row level security;
alter table public.document_reviews enable row level security;

revoke all on table public.document_variants, public.document_images, public.document_reviews from anon, authenticated;
grant select on table public.document_variants, public.document_images to anon, authenticated;
grant select, insert on table public.document_reviews to anon, authenticated;
grant update, delete on table public.document_reviews to authenticated;

create policy document_variants_public_read
  on public.document_variants for select to anon, authenticated
  using ((enabled = true and exists (select 1 from public.documents d where d.id = document_variants.document_id and d.published = true)) or is_admin());

create policy document_variants_admin_insert
  on public.document_variants for insert to authenticated with check (is_admin());

create policy document_variants_admin_update
  on public.document_variants for update to authenticated using (is_admin()) with check (is_admin());

create policy document_variants_admin_delete
  on public.document_variants for delete to authenticated using (is_admin());

create policy document_images_public_read
  on public.document_images for select to anon, authenticated
  using (exists (select 1 from public.documents d where d.id = document_images.document_id and d.published = true) or is_admin());

create policy document_images_admin_insert
  on public.document_images for insert to authenticated with check (is_admin());

create policy document_images_admin_update
  on public.document_images for update to authenticated using (is_admin()) with check (is_admin());

create policy document_images_admin_delete
  on public.document_images for delete to authenticated using (is_admin());

create policy document_reviews_public_read
  on public.document_reviews for select to anon, authenticated
  using ((approved = true and exists (select 1 from public.documents d where d.id = document_reviews.document_id and d.published = true)) or is_admin());

create policy document_reviews_public_insert
  on public.document_reviews for insert to anon, authenticated
  with check (approved = false and exists (select 1 from public.documents d where d.id = document_reviews.document_id and d.published = true));

create policy document_reviews_admin_update
  on public.document_reviews for update to authenticated using (is_admin()) with check (is_admin());

create policy document_reviews_admin_delete
  on public.document_reviews for delete to authenticated using (is_admin());

create or replace function public.increment_download_count(doc_id uuid)
returns void language sql security invoker set search_path = public
as $$
  update public.documents
  set download_count = coalesce(download_count, 0) + 1, updated_at = now()
  where id = doc_id and published = true and download_enabled = true;
$$;

revoke all on function public.increment_download_count(uuid) from public;
grant execute on function public.increment_download_count(uuid) to anon, authenticated;
