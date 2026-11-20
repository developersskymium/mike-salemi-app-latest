-- A program with levels (KBL) must never hold an enrollment without a level:
-- Home, Today and the schedule key enrollments by program + level, so a
-- level-less row hides the program. When something enrolls without naming a
-- level, start them on the first level (Level 1). Choosing Level 2 later
-- enrolls that level explicitly, as before.
create or replace function public.enrollments_default_level()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.path_id is null then
    select pp.id into new.path_id
    from public.program_paths pp
    where pp.program_id = new.program_id and pp.kind = 'level'
    order by pp.position
    limit 1;
  end if;
  return new;
end;
$$;

drop trigger if exists enrollments_default_level on public.enrollments;
create trigger enrollments_default_level
  before insert on public.enrollments
  for each row execute function public.enrollments_default_level();
