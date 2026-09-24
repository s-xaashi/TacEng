alter table public.documents
  add column if not exists download_count_adjustment integer not null default 0;

alter table public.documents
  add constraint documents_download_count_adjustment_range
  check (download_count_adjustment between -1000000000 and 1000000000);