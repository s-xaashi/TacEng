-- Allow image-only campaigns and support redirect analytics.
alter table public.ad_campaigns
  alter column title_en drop not null;

alter table public.ad_campaigns
  drop constraint if exists ad_campaign_action_check;

alter table public.ad_campaigns
  add constraint ad_campaign_action_check check (
    (ad_type = 'action' and (action_type is not null or image_path is not null))
    or (ad_type <> 'action' and action_type is null)
  );

alter table public.ad_events
  drop constraint if exists ad_events_event_type_check;

alter table public.ad_events
  add constraint ad_events_event_type_check check (
    event_type in ('impression','interested','not_interested','action','coupon_copy','form_submit','redirect_click')
  );
