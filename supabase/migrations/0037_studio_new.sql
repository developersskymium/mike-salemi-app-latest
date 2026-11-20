-- 0037 — Studio screens for the Nov 20 content: status + notes for retreat enquiries and account requests.
-- Additive only. Staff write these through Studio server actions (service role, admin-checked).

alter table public.retreat_leads add column if not exists status text not null default 'new';
alter table public.retreat_leads add column if not exists admin_note text;
do $$ begin
  alter table public.retreat_leads add constraint retreat_leads_status_chk check (status in ('new', 'contacted', 'booked', 'closed'));
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.retreat_leads add constraint retreat_leads_admin_note_len check (admin_note is null or length(admin_note) <= 2000);
exception when duplicate_object then null; end $$;
-- Leads already marked handled count as contacted.
update public.retreat_leads set status = 'contacted' where handled_at is not null and status = 'new';

alter table public.account_requests add column if not exists admin_note text;
do $$ begin
  alter table public.account_requests add constraint account_requests_admin_note_len check (admin_note is null or length(admin_note) <= 4000);
exception when duplicate_object then null; end $$;
