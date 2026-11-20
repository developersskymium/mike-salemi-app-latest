-- Members may read their own roles (the admin studio checks the signed-in user's admin role).
grant select on public.user_roles to authenticated;
create policy read_own_roles on public.user_roles for select to authenticated using (user_id = (select auth.uid()));
