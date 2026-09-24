-- Allow authenticated admins to mutate document options.
-- RLS policies on document_variants still require is_admin().
grant insert, update, delete on table public.document_variants to authenticated;
