alter table public.documents
  add column if not exists title_en text,
  add column if not exists description_en text,
  add column if not exists title_so text,
  add column if not exists description_so text;

update public.documents
set title_en = coalesce(title_en, title),
    description_en = coalesce(description_en, description)
where title_en is null or description_en is null;