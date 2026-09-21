create table if not exists public.support_payments (
  id uuid primary key default gen_random_uuid(),
  amount numeric(12,2) not null check (amount >= 1 and amount <= 10000),
  currency text not null default "USD" check (currency = "USD"),
  payment_method text not null,
  payment_reference text not null unique,
  customer_phone text,
  provider_transaction_id text unique,
  status text not null default "pending" check (status in ("pending","paid","failed","cancelled","expired")),
  created_at timestamptz not null default now(),
  paid_at timestamptz
);
alter table public.support_payments enable row level security;