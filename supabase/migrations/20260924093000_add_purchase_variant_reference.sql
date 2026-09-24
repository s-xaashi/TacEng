alter table public.purchases
  add column if not exists variant_id uuid null references public.document_variants(id) on delete set null;

create index if not exists purchases_variant_idx
  on public.purchases(variant_id);