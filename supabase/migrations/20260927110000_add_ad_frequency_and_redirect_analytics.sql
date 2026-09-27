alter table public.ad_campaigns
  add column if not exists max_impressions_per_visitor integer not null default 1;

alter table public.ad_campaigns
  drop constraint if exists ad_campaigns_max_impressions_per_visitor_check;

alter table public.ad_campaigns
  add constraint ad_campaigns_max_impressions_per_visitor_check
  check (max_impressions_per_visitor between 0 and 100);

alter table public.ad_events
  drop constraint if exists ad_events_event_type_check;

alter table public.ad_events
  add constraint ad_events_event_type_check
  check (event_type in ('impression','interested','not_interested','action','redirect_click','coupon_copy','form_submit'));

create index if not exists ad_events_campaign_visitor_type_idx
  on public.ad_events (campaign_id, visitor_id, event_type, created_at desc);
