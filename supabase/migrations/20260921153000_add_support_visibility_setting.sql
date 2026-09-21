alter table public.portfolio_content
  add column if not exists support_enabled boolean not null default true;

update public.portfolio_content
set support_enabled = true
where id = true;
