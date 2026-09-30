alter table public.documents
  add column if not exists file_storage text not null default 'supabase';

alter table public.documents
  drop constraint if exists documents_file_storage_check;

alter table public.documents
  add constraint documents_file_storage_check
  check (file_storage in ('supabase', 'r2-private', 'r2-public'));

alter table public.document_variants
  add column if not exists file_storage text not null default 'supabase';

alter table public.document_variants
  drop constraint if exists document_variants_file_storage_check;

alter table public.document_variants
  add constraint document_variants_file_storage_check
  check (file_storage in ('supabase', 'r2-private', 'r2-public'));