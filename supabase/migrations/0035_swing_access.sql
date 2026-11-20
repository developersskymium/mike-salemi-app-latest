-- 0035 Swing Set-Up Coach decisions (Nov 21, spec 13 › Decided). Additive only.

-- Under-18s can't use the camera check: the one-time disclaimer now carries "I'm 18 or older".
alter table public.setup_profiles add column if not exists adult_confirmed_at timestamptz;

-- Every swing check is saved (and listed in Saves via tool_results), but no email per check.
create or replace function private.outbox_on_tool_result() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.tool_id = 'swing-setup' then
    return new;
  end if;
  perform private.enqueue_email(new.user_id, 'tool_result', new.id::text, jsonb_build_object('tool_result_id', new.id, 'tool_id', new.tool_id));
  return new;
end $$;
