-- S&T Budget App v5.0 Final migration
-- Run AFTER supabase-v5-migration.sql. Safe to re-run.

begin;

-- Secure invite acceptance: an authenticated user may accept only an unexpired
-- pending invite addressed to the email in their JWT.
create or replace function public.accept_household_invite(invite_uuid uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  inv public.household_invites%rowtype;
  caller_email text;
begin
  caller_email := lower(coalesce(auth.jwt() ->> 'email',''));
  if auth.uid() is null or caller_email = '' then
    raise exception 'Authentication required';
  end if;

  select * into inv
  from public.household_invites
  where id = invite_uuid
    and status = 'pending'
  for update;

  if not found then raise exception 'Invite not found or no longer pending'; end if;
  if lower(inv.invited_email) <> caller_email then raise exception 'This invite belongs to another email address'; end if;
  if inv.expires_at <= now() then
    update public.household_invites set status='expired' where id=invite_uuid;
    raise exception 'Invite has expired';
  end if;

  insert into public.household_members(household_id,user_id,role,status,permissions)
  values(inv.household_id,auth.uid(),inv.role,'active',inv.permissions)
  on conflict(household_id,user_id) do update
    set role=excluded.role,status='active',permissions=excluded.permissions,updated_at=now();

  update public.household_invites
    set status='accepted',accepted_by=auth.uid(),accepted_at=now()
    where id=invite_uuid;

  insert into public.household_activity(household_id,user_id,action,entity_type,metadata)
  values(inv.household_id,auth.uid(),'Joined household','member',jsonb_build_object('role',inv.role));

  return inv.household_id;
end;
$$;

grant execute on function public.accept_household_invite(uuid) to authenticated;

-- Ensure all v5 rows update their visible updated_at timestamps where available.
-- Existing generic trigger function from v4 is reused when present.
do $$
declare t text;
begin
  if exists(select 1 from pg_proc where proname='set_updated_at' and pronamespace='public'::regnamespace) then
    foreach t in array array['households','household_members','household_transactions','household_bills','household_goals','vehicle_payment_history'] loop
      execute format('drop trigger if exists %I_set_updated_at on public.%I',t,t);
      execute format('create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',t,t);
    end loop;
  end if;
end $$;

commit;
