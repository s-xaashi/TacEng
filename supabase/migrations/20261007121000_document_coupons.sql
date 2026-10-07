create table if not exists public.document_coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  discount_type text not null check (discount_type in ('full', 'percentage')),
  discount_percent numeric(5,2),
  active boolean not null default true,
  applies_to_all boolean not null default false,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_coupons_percentage_check check (
    (discount_type = 'full' and discount_percent is null)
    or
    (discount_type = 'percentage' and discount_percent > 0 and discount_percent <= 100)
  ),
  constraint document_coupons_dates_check check (
    expires_at is null or starts_at is null or expires_at > starts_at
  )
);

create unique index if not exists document_coupons_code_upper_idx
  on public.document_coupons (upper(code));

create table if not exists public.document_coupon_documents (
  coupon_id uuid not null references public.document_coupons(id) on delete cascade,
  document_id uuid not null references public.documents(id) on delete cascade,
  primary key (coupon_id, document_id)
);

alter table public.document_coupons enable row level security;
alter table public.document_coupon_documents enable row level security;

revoke all on table public.document_coupons from anon, authenticated;
revoke all on table public.document_coupon_documents from anon, authenticated;
grant all on table public.document_coupons to service_role;
grant all on table public.document_coupon_documents to service_role;

alter table public.purchases add column if not exists coupon_id uuid references public.document_coupons(id) on delete set null;
alter table public.purchases add column if not exists coupon_code text;
alter table public.purchases add column if not exists original_amount numeric(12,2);
alter table public.purchases add column if not exists discount_amount numeric(12,2);

create index if not exists purchases_coupon_id_idx on public.purchases(coupon_id);

drop trigger if exists document_coupons_set_updated_at on public.document_coupons;
create trigger document_coupons_set_updated_at
before update on public.document_coupons
for each row execute function public.set_updated_at();