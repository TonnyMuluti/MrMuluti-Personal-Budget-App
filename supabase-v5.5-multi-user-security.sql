-- S&T Budget v5.5.0 — Multi User Privacy hardening
-- Run this in Supabase SQL Editor once before inviting additional users.
-- It makes every personal finance row accessible only to its authenticated owner.

begin;

-- Personal tables used by the app. Each table stores auth.uid() in user_id.
do $$
declare
  t text;
  p record;
begin
  foreach t in array array[
    'salary_settings','expenses','transactions','bills','savings_goals','debts',
    'what_if_settings','app_settings','assets','user_preferences',
    'vehicle_payment_history','assistant_history'
  ] loop
    if to_regclass('public.'||t) is not null then
      execute format('alter table public.%I enable row level security',t);
      execute format('alter table public.%I force row level security',t);
      -- Remove older policies so a permissive legacy policy cannot be OR-ed with the strict owner policy.
      for p in select policyname from pg_policies where schemaname='public' and tablename=t loop
        execute format('drop policy if exists %I on public.%I',p.policyname,t);
      end loop;
      execute format(
        'create policy %I on public.%I for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id)',
        'v55_private_owner_all_'||t,t
      );
    end if;
  end loop;
end $$;

-- Household tables keep their existing member-based sharing policies and are intentionally not changed here.

commit;

-- Verification helper: every row returned here should show rowsecurity = true.
select c.relname as table_name, c.relrowsecurity as row_security_enabled, c.relforcerowsecurity as row_security_forced
from pg_class c
join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public'
  and c.relname in ('salary_settings','expenses','transactions','bills','savings_goals','debts','what_if_settings','app_settings','assets','user_preferences','vehicle_payment_history','assistant_history')
order by c.relname;
