drop function if exists public.increment_download_count(uuid);

create function public.increment_download_count(doc_id uuid)
returns bigint
language sql
security definer
set search_path = ''
as $$
  update public.documents
  set download_count = coalesce(download_count, 0) + 1,
      updated_at = now()
  where id = doc_id
    and published = true
    and download_enabled = true
  returning download_count;
$$;

revoke all on function public.increment_download_count(uuid) from public, anon, authenticated;
grant execute on function public.increment_download_count(uuid) to anon, authenticated;
