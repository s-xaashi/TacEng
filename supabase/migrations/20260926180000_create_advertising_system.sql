create table if not exists public.ad_campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  ad_type text not null check (ad_type in ('announcement','action','form')),
  status text not null default 'draft' check (status in ('draft','active','paused','archived')),
  priority integer not null default 0 check (priority between -1000 and 1000),
  start_at timestamptz,
  end_at timestamptz,
  title_en text not null check (char_length(btrim(title_en)) between 1 and 200),
  title_so text check (title_so is null or char_length(btrim(title_so)) between 1 and 200),
  description_en text check (description_en is null or char_length(description_en) <= 3000),
  description_so text check (description_so is null or char_length(description_so) <= 3000),
  highlights_en text[] not null default '{}', highlights_so text[] not null default '{}',
  image_path text,
  cta_en text check (cta_en is null or char_length(btrim(cta_en)) between 1 and 80),
  cta_so text check (cta_so is null or char_length(btrim(cta_so)) between 1 and 80),
  action_type text check (action_type is null or action_type in ('coupon','redirect')),
  redirect_url text check (redirect_url is null or redirect_url ~* '^https?://[^[:space:]]+$'),
  coupon_code text check (coupon_code is null or (char_length(btrim(coupon_code)) between 1 and 64 and coupon_code ~ '^[A-Za-z0-9_-]+$')),
  coupon_title_en text, coupon_title_so text,
  coupon_description_en text check (coupon_description_en is null or char_length(coupon_description_en) <= 3000),
  coupon_description_so text check (coupon_description_so is null or char_length(coupon_description_so) <= 3000),
  coupon_highlights_en text[] not null default '{}', coupon_highlights_so text[] not null default '{}',
  coupon_image_path text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint ad_campaign_schedule_check check (end_at is null or start_at is null or end_at > start_at),
  constraint ad_campaign_action_check check ((ad_type = 'action' and action_type is not null) or (ad_type <> 'action' and action_type is null)),
  constraint ad_campaign_coupon_check check ((action_type = 'coupon' and coupon_code is not null and redirect_url is not null) or (action_type <> 'coupon' or action_type is null)),
  constraint ad_campaign_redirect_check check ((action_type = 'redirect' and redirect_url is not null) or (action_type <> 'redirect' or action_type is null))
);
create table if not exists public.ad_form_fields (
  id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  field_key text not null check (field_key ~ '^[a-z][a-z0-9_]{0,39}$'),
  label_en text not null check (char_length(btrim(label_en)) between 1 and 120), label_so text,
  field_type text not null check (field_type in ('text','email','phone','number','textarea','select','checkbox')),
  placeholder_en text, placeholder_so text, options_en text[] not null default '{}', options_so text[] not null default '{}',
  required boolean not null default false, sort_order integer not null default 0 check (sort_order between 0 and 100), created_at timestamptz not null default now(),
  unique (campaign_id, field_key)
);
create table if not exists public.ad_submissions (
  id uuid primary key default gen_random_uuid(), campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  visitor_id uuid not null, locale text not null default 'en' check (locale in ('en','so')),
  data jsonb not null default '{}'::jsonb check (jsonb_typeof(data) = 'object'), submitted_at timestamptz not null default now()
);
create table if not exists public.ad_events (
  id bigint generated always as identity primary key, campaign_id uuid not null references public.ad_campaigns(id) on delete cascade,
  event_type text not null check (event_type in ('impression','interested','not_interested','action','coupon_copy','form_submit')),
  visitor_id uuid, created_at timestamptz not null default now()
);
create index if not exists ad_campaigns_public_idx on public.ad_campaigns (status,start_at,end_at,priority desc);
create index if not exists ad_form_fields_campaign_idx on public.ad_form_fields (campaign_id,sort_order);
create index if not exists ad_submissions_campaign_idx on public.ad_submissions (campaign_id,submitted_at desc);
create index if not exists ad_submissions_rate_idx on public.ad_submissions (campaign_id,visitor_id,submitted_at desc);
create index if not exists ad_events_campaign_idx on public.ad_events (campaign_id,event_type,created_at desc);
alter table public.ad_campaigns enable row level security; alter table public.ad_form_fields enable row level security; alter table public.ad_submissions enable row level security; alter table public.ad_events enable row level security;
create policy "Public can read active ads" on public.ad_campaigns for select to anon,authenticated using (status='active' and (start_at is null or start_at<=now()) and (end_at is null or end_at>=now()));
create policy "Admins can manage ads" on public.ad_campaigns for all to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy "Public can read active ad form fields" on public.ad_form_fields for select to anon,authenticated using (exists(select 1 from public.ad_campaigns c where c.id=campaign_id and c.ad_type='form' and c.status='active' and (c.start_at is null or c.start_at<=now()) and (c.end_at is null or c.end_at>=now())));
create policy "Admins can manage ad form fields" on public.ad_form_fields for all to authenticated using ((select is_admin())) with check ((select is_admin()));
create policy "Admins can read ad submissions" on public.ad_submissions for select to authenticated using ((select is_admin()));
create policy "Admins can delete ad submissions" on public.ad_submissions for delete to authenticated using ((select is_admin()));
create policy "Public can record ad events" on public.ad_events for insert to anon,authenticated with check (exists(select 1 from public.ad_campaigns c where c.id=campaign_id and c.status='active' and (c.start_at is null or c.start_at<=now()) and (c.end_at is null or c.end_at>=now())));
create policy "Admins can read ad events" on public.ad_events for select to authenticated using ((select is_admin()));
revoke insert,update,delete on public.ad_submissions from anon,authenticated;
revoke update,delete on public.ad_events from anon,authenticated;