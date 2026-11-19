create table public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
grant select on public.site_settings to authenticated;
grant insert, update, delete on public.site_settings to authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;
create policy site_settings_read on public.site_settings for select to authenticated using (true);
create policy site_settings_insert on public.site_settings for insert to authenticated with check (private.has_role(auth.uid(), 'admin'::public.app_role));
create policy site_settings_update on public.site_settings for update to authenticated using (private.has_role(auth.uid(), 'admin'::public.app_role)) with check (private.has_role(auth.uid(), 'admin'::public.app_role));
create policy site_settings_delete on public.site_settings for delete to authenticated using (private.has_role(auth.uid(), 'admin'::public.app_role));
insert into public.site_settings (key, value) values
('announcement', '{"enabled": true, "id": "2026-10-live-qa", "badge": "Preview", "text": "Monthly live Q&A with Mike — date to be announced.", "linkLabel": "See retreats", "linkTo": "/retreats", "tone": "primary"}'),
('home', '{"heroEyebrow": "", "featuredSlug": "", "enrolledTitle": "Your enrolled programs"}'),
('programs_page', '{"title": "Programs", "intro": "", "kblBadge": "Flagship program", "kblTitle": "Kettlebell Lifestyle", "kblCopy": "Mike''s complete kettlebell journey. Choose a structured day-by-day Immersion or train at your own pace with Self-Guided."}');