-- Only these settings are public; anything else (tokens, internal flags) is readable by admins and the service role only.
alter policy public_read on public.site_settings using (key in ('brand', 'home', 'programs_page', 'referral_tiers', 'shop'));
