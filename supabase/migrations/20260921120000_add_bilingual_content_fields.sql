alter table public.blogs
  add column if not exists title_en text,
  add column if not exists excerpt_en text,
  add column if not exists blocks_en jsonb not null default '[]'::jsonb,
  add column if not exists title_so text,
  add column if not exists excerpt_so text,
  add column if not exists blocks_so jsonb not null default '[]'::jsonb;

update public.blogs
set title_en = coalesce(title_en, title),
    excerpt_en = coalesce(excerpt_en, excerpt),
    blocks_en = case when blocks_en = '[]'::jsonb and blocks <> '[]'::jsonb then blocks else blocks_en end;

alter table public.blog_sections
  add column if not exists label_en text,
  add column if not exists label_so text;

update public.blog_sections set label_en = coalesce(label_en, label);

alter table public.projects
  add column if not exists title_en text,
  add column if not exists description_en text,
  add column if not exists title_so text,
  add column if not exists description_so text;

update public.projects
set title_en = coalesce(title_en, title),
    description_en = coalesce(description_en, description);

alter table public.experiences
  add column if not exists role_en text,
  add column if not exists description_en text,
  add column if not exists responsibilities_en text[],
  add column if not exists role_so text,
  add column if not exists description_so text,
  add column if not exists responsibilities_so text[];

update public.experiences
set role_en = coalesce(role_en, role),
    description_en = coalesce(description_en, description),
    responsibilities_en = coalesce(responsibilities_en, responsibilities);

alter table public.learning_items
  add column if not exists section_label_en text,
  add column if not exists title_en text,
  add column if not exists degree_en text,
  add column if not exists period_en text,
  add column if not exists status_en text,
  add column if not exists description_en text,
  add column if not exists section_label_so text,
  add column if not exists title_so text,
  add column if not exists degree_so text,
  add column if not exists period_so text,
  add column if not exists status_so text,
  add column if not exists description_so text;

update public.learning_items
set section_label_en = coalesce(section_label_en, section_label),
    title_en = coalesce(title_en, title),
    degree_en = coalesce(degree_en, degree),
    period_en = coalesce(period_en, period),
    status_en = coalesce(status_en, status),
    description_en = coalesce(description_en, description);

alter table public.portfolio_content
  add column if not exists quick_note_en text,
  add column if not exists quote_text_en text,
  add column if not exists quote_author_en text,
  add column if not exists quick_note_so text,
  add column if not exists quote_text_so text,
  add column if not exists quote_author_so text;

update public.portfolio_content
set quick_note_en = coalesce(quick_note_en, quick_note),
    quote_text_en = coalesce(quote_text_en, quote_text),
    quote_author_en = coalesce(quote_author_en, quote_author);

alter table public.blogs alter column title_en set not null;
alter table public.blog_sections alter column label_en set not null;
alter table public.projects alter column title_en set not null;
alter table public.experiences alter column role_en set not null;
alter table public.learning_items alter column title_en set not null;
