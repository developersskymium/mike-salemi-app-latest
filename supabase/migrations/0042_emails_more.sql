-- 0042 More automated emails (additive only).
-- Each trigger only inserts a row in public.email_outbox through private.enqueue_email (0013), which
-- swallows its own errors, so an email problem can never block an order, booking or application.
-- The web app renders the email from live data when the 5-minute email cron drains the outbox.
--
--   order_confirmation            orders.status becomes 'paid' and the order has shop products
--   order_shipped                 orders.fulfillment becomes 'shipped'
--   coaching_booked               coaching_bookings insert (status 'booked')
--   retreat_application_received  run_applications insert
--   retreat_application_update    run_applications.status becomes 'accepted' or 'waitlist'
--   referral_reward               referrals.status becomes 'rewarded' (apply_paid_order → reward_referrer)
--
-- Billing emails (receipts, failed payments, plan ending/ended/paused) are queued by the Stripe webhook,
-- coaching_reminder and win_back by the hourly reminders cron: no SQL needed for those.

-- ================================================================= shop orders
create or replace function private.outbox_on_order() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.user_id is null or coalesce(new.is_test, false) then return new; end if;
  if new.status = 'paid' and (tg_op = 'INSERT' or old.status is distinct from 'paid')
     and exists (select 1 from public.order_items i where i.order_id = new.id and i.kind = 'product') then
    perform private.enqueue_email(new.user_id, 'order_confirmation', new.id::text, jsonb_build_object('order_id', new.id));
  end if;
  if new.fulfillment = 'shipped' and (tg_op = 'INSERT' or old.fulfillment is distinct from 'shipped') then
    perform private.enqueue_email(new.user_id, 'order_shipped', new.id::text, jsonb_build_object('order_id', new.id));
  end if;
  return new;
end $$;

create or replace trigger outbox_order after update of status, fulfillment on public.orders
  for each row execute function private.outbox_on_order();

-- ================================================================= coaching
create or replace function private.outbox_on_coaching_booking() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'booked' then
    perform private.enqueue_email(new.user_id, 'coaching_booked', new.id::text, jsonb_build_object('booking_id', new.id));
  end if;
  return new;
end $$;

create or replace trigger outbox_coaching_booking after insert on public.coaching_bookings
  for each row execute function private.outbox_on_coaching_booking();

-- ================================================================= retreat applications
create or replace function private.outbox_on_run_application() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform private.enqueue_email(new.user_id, 'retreat_application_received', new.id::text, jsonb_build_object('application_id', new.id));
  elsif new.status in ('accepted', 'waitlist') and old.status is distinct from new.status then
    -- One email per decision (accepted after waitlist sends again).
    perform private.enqueue_email(new.user_id, 'retreat_application_update', new.id::text || ':' || new.status,
      jsonb_build_object('application_id', new.id, 'status', new.status));
  end if;
  return new;
end $$;

create or replace trigger outbox_run_application after insert or update of status on public.run_applications
  for each row execute function private.outbox_on_run_application();

-- ================================================================= referral reward
create or replace function private.outbox_on_referral() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'rewarded' and (tg_op = 'INSERT' or old.status is distinct from 'rewarded') then
    perform private.enqueue_email(new.referrer_id, 'referral_reward', new.id::text, jsonb_build_object('referral_id', new.id));
  end if;
  return new;
end $$;

create or replace trigger outbox_referral after insert or update of status on public.referrals
  for each row execute function private.outbox_on_referral();

revoke all on function private.outbox_on_order(), private.outbox_on_coaching_booking(),
  private.outbox_on_run_application(), private.outbox_on_referral() from public, anon, authenticated;
