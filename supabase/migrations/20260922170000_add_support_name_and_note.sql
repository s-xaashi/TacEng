alter table public.support_payments
  add column if not exists customer_name text,
  add column if not exists customer_note text;

alter table public.support_payments
  drop constraint if exists support_payments_customer_name_valid,
  drop constraint if exists support_payments_customer_note_valid;

alter table public.support_payments
  add constraint support_payments_customer_name_valid check (
    customer_name is null
    or (
      char_length(btrim(customer_name)) between 1 and 80
      and customer_name !~ '[[:cntrl:]]'
      and customer_name !~ '<[^>]*>'
      and customer_name !~* '(https?://|www\.|[[:alnum:]_-]+\.[[:alpha:]]{2,})'
    )
  ),
  add constraint support_payments_customer_note_valid check (
    customer_note is null
    or (
      char_length(btrim(customer_note)) between 1 and 200
      and customer_note !~ '[[:cntrl:]]'
      and customer_note !~ '<[^>]*>'
      and customer_note !~* '(https?://|www\.|javascript:|data:|[[:alnum:]_-]+\.[[:alpha:]]{2,})'
    )
  );
