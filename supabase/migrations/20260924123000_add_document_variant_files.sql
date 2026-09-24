alter table public.document_variants
  add column if not exists file_path text,
  add column if not exists file_bucket text not null default 'free-documents';

alter table public.document_variants
  drop constraint if exists document_variants_file_bucket_check;

alter table public.document_variants
  add constraint document_variants_file_bucket_check
  check (file_bucket in ('free-documents', 'paid-documents'));

create index if not exists document_variants_file_idx
  on public.document_variants(document_id, file_bucket);
