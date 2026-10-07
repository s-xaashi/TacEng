create table if not exists public.document_coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  discount_type text not null check (discount_type in ('full', 'percentage')),
  discount_percent numeric(5,2),
  active boolean not null default true,
  starts_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint document_coupons_percentage_check
    check (
      (discount_type = 'full' and discount_percent is null)
      or
      (discount_type = 'percentage' and discount_percent > 0 and discount_percent <= 100)
    ),
  constraint document_coupons_dates_check
    check (expires_at is null or starts_at is null or expires_at > starts_at)
);

create index if not exists document_coupons_active_idx
  on public.document_coupons (active, starts_at, expires_at);

alter table public.purchases
  add column if not exists coupon_id uuid references public.document_coupons(id) on delete set null,
  add column if not exists coupon_code text,
  add column if not exists original_amount numeric(12,2),
  add column if not exists discount_amount numeric(12,2);

create index if not exists purchases_coupon_id_idx
  on public.purchases (coupon_id);

alter table public.document_coupons enable row level security;
revoke all on table public.document_coupons from anon, authenticated;
grant all on table public.document_coupons to service_role;

create or replace function public.set_document_coupon_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists document_coupons_set_updated_at on public.document_coupons;
create trigger document_coupons_set_updated_at
before update on public.document_coupons
for each row execute function public.set_document_coupon_updated_at();
