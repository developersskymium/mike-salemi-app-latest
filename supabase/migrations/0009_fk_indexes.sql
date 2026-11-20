-- Indexes for foreign keys flagged by the Supabase performance advisor.
create index if not exists form_bands_table_idx on public.form_bands (table_id);
create index if not exists forms_default_table_idx on public.forms (default_table_id);
create index if not exists organizations_plan_idx on public.organizations (plan_id);
create index if not exists programs_category_idx on public.programs (category_id);
create index if not exists sections_intro_video_idx on public.sections (intro_video_id);
create index if not exists sections_path_idx on public.sections (path_id);
