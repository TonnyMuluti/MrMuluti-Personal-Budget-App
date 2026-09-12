-- S&T Budget App v5.0 migration
-- Builds on v4.0. Additive and safe to re-run where noted.
-- Run this in Supabase SQL Editor before deploying the v5 frontend.

begin;

-- ============================================================
-- 1. Goal Priority System
-- ============================================================
alter table public.savings_goals
  add column if not exists priority text not null default 'Medium',
  add column if not exists goal_type text not null default 'Custom',
  add column if not exists sort_order integer not null default 0,
  add column if not exists paused boolean not null default false,
  add column if not exists minimum_monthly_contribution numeric not null default 0,
  add column if not exists allocation_weight numeric not null default 1,
  add column if not exists milestone_amount numeric not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'savings_goals_priority_check'
      and conrelid = 'public.savings_goals'::regclass
  ) then
    alter table public.savings_goals
      add constraint savings_goals_priority_check
      check (priority in ('Critical','High','Medium','Low'));
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'savings_goals_type_check'
      and conrelid = 'public.savings_goals'::regclass
  ) then
    alter table public.savings_goals
      add constraint savings_goals_type_check
      check (goal_type in ('Emergency','Debt Payoff','Investment','Purchase','Travel','Education','Custom'));
  end if;
end $$;

-- ============================================================
-- 2. Vehicle Finance Dashboard+
-- ============================================================
alter table public.debts
  add column if not exists debt_type text not null default 'Other',
  add column if not exists is_vehicle_finance boolean not null default false,
  add column if not exists original_finance_amount numeric,
  add column if not exists outstanding_principal numeric,
  add column if not exists balance_basis text not null default 'scheduled_payments',
  add column if not exists vehicle_description text,
  add column if not exists next_payment_date date,
  add column if not exists finance_start_date date;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'debts_balance_basis_check'
      and conrelid = 'public.debts'::regclass
  ) then
    alter table public.debts
      add constraint debts_balance_basis_check
      check (balance_basis in ('scheduled_payments','principal','user_entered'));
  end if;
end $$;

create table if not exists public.vehicle_payment_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  debt_id uuid references public.debts(id) on delete cascade,
  payment_date date not null,
  regular_payment numeric not null default 0,
  extra_payment numeric not null default 0,
  interest_amount numeric not null default 0,
  principal_amount numeric not null default 0,
  balance_after numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.vehicle_payment_history enable row level security;

drop policy if exists "vehicle_history_own_rows" on public.vehicle_payment_history;
create policy "vehicle_history_own_rows"
on public.vehicle_payment_history
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create index if not exists vehicle_payment_history_user_idx
  on public.vehicle_payment_history(user_id, payment_date desc);
create index if not exists vehicle_payment_history_debt_idx
  on public.vehicle_payment_history(debt_id, payment_date desc);

-- ============================================================
-- 3. Household security helpers
-- ============================================================
create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'Viewer',
  status text not null default 'active',
  permissions jsonb not null default '{"transactions":"view","bills":"view","goals":"view","contributions":"view","reports":"view"}'::jsonb,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (household_id, user_id),
  constraint household_members_role_check check (role in ('Owner','Partner','Viewer')),
  constraint household_members_status_check check (status in ('active','suspended'))
);

create table if not exists public.household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  invited_email text not null,
  invited_by uuid not null references auth.users(id) on delete cascade,
  role text not null default 'Partner',
  permissions jsonb not null default '{"transactions":"edit","bills":"edit","goals":"edit","contributions":"edit","reports":"view"}'::jsonb,
  status text not null default 'pending',
  expires_at timestamptz not null default (now() + interval '14 days'),
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  constraint household_invites_role_check check (role in ('Partner','Viewer')),
  constraint household_invites_status_check check (status in ('pending','accepted','declined','expired','cancelled'))
);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;

create or replace function public.is_household_member(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = hid
      and hm.user_id = auth.uid()
      and hm.status = 'active'
  );
$$;

create or replace function public.is_household_owner(hid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = hid
      and hm.user_id = auth.uid()
      and hm.role = 'Owner'
      and hm.status = 'active'
  );
$$;

create or replace function public.household_can_edit(hid uuid, section_name text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.household_members hm
    where hm.household_id = hid
      and hm.user_id = auth.uid()
      and hm.status = 'active'
      and (
        hm.role = 'Owner'
        or (
          hm.role = 'Partner'
          and coalesce(hm.permissions ->> section_name, 'edit') in ('edit','manage')
        )
      )
  );
$$;

grant execute on function public.is_household_member(uuid) to authenticated;
grant execute on function public.is_household_owner(uuid) to authenticated;
grant execute on function public.household_can_edit(uuid,text) to authenticated;

-- A user may see households they belong to. Creation is tied to auth.uid().
drop policy if exists "households_member_select" on public.households;
create policy "households_member_select"
on public.households for select to authenticated
using (public.is_household_member(id) or created_by = auth.uid());

drop policy if exists "households_create" on public.households;
create policy "households_create"
on public.households for insert to authenticated
with check (created_by = auth.uid());

drop policy if exists "households_owner_update" on public.households;
create policy "households_owner_update"
on public.households for update to authenticated
using (public.is_household_owner(id))
with check (public.is_household_owner(id));

drop policy if exists "households_owner_delete" on public.households;
create policy "households_owner_delete"
on public.households for delete to authenticated
using (public.is_household_owner(id));

-- Members can see the roster; only owners manage membership.
drop policy if exists "household_members_roster" on public.household_members;
create policy "household_members_roster"
on public.household_members for select to authenticated
using (public.is_household_member(household_id) or user_id = auth.uid());

drop policy if exists "household_members_owner_insert" on public.household_members;
create policy "household_members_owner_insert"
on public.household_members for insert to authenticated
with check (
  public.is_household_owner(household_id)
  or (
    user_id = auth.uid()
    and role = 'Owner'
    and exists (
      select 1 from public.households h
      where h.id = household_id and h.created_by = auth.uid()
    )
  )
);

drop policy if exists "household_members_owner_update" on public.household_members;
create policy "household_members_owner_update"
on public.household_members for update to authenticated
using (public.is_household_owner(household_id))
with check (public.is_household_owner(household_id));

drop policy if exists "household_members_owner_delete" on public.household_members;
create policy "household_members_owner_delete"
on public.household_members for delete to authenticated
using (public.is_household_owner(household_id));

-- Owners can manage invites. Invitees can see/update only invites addressed to their JWT email.
drop policy if exists "household_invites_select" on public.household_invites;
create policy "household_invites_select"
on public.household_invites for select to authenticated
using (
  public.is_household_owner(household_id)
  or lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email',''))
);

drop policy if exists "household_invites_owner_insert" on public.household_invites;
create policy "household_invites_owner_insert"
on public.household_invites for insert to authenticated
with check (public.is_household_owner(household_id) and invited_by = auth.uid());

drop policy if exists "household_invites_owner_or_invitee_update" on public.household_invites;
create policy "household_invites_owner_or_invitee_update"
on public.household_invites for update to authenticated
using (
  public.is_household_owner(household_id)
  or lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email',''))
)
with check (
  public.is_household_owner(household_id)
  or lower(invited_email) = lower(coalesce(auth.jwt() ->> 'email',''))
);

drop policy if exists "household_invites_owner_delete" on public.household_invites;
create policy "household_invites_owner_delete"
on public.household_invites for delete to authenticated
using (public.is_household_owner(household_id));

-- ============================================================
-- 4. Shared household finance tables
-- Personal v4 tables stay private. Shared data lives separately.
-- ============================================================
create table if not exists public.household_transactions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  assigned_to uuid references auth.users(id) on delete set null,
  transaction_date date not null,
  description text not null,
  transaction_type text not null default 'Expense',
  category text,
  payment_method text,
  amount numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.household_bills (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null,
  monthly_amount numeric not null default 0,
  due_day integer not null default 1 check (due_day between 1 and 31),
  priority text not null default 'Medium',
  payment_method text,
  autopay boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.household_goals (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  name text not null,
  goal_type text not null default 'Custom',
  priority text not null default 'Medium',
  target_amount numeric not null default 0,
  saved_amount numeric not null default 0,
  target_date date,
  paused boolean not null default false,
  sort_order integer not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint household_goals_priority_check check (priority in ('Critical','High','Medium','Low')),
  constraint household_goals_type_check check (goal_type in ('Emergency','Debt Payoff','Investment','Purchase','Travel','Education','Custom'))
);

create table if not exists public.household_contributions (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  contribution_date date not null default current_date,
  amount numeric not null check (amount >= 0),
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.household_activity (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.household_transactions enable row level security;
alter table public.household_bills enable row level security;
alter table public.household_goals enable row level security;
alter table public.household_contributions enable row level security;
alter table public.household_activity enable row level security;

-- Read policies: active household members only.
drop policy if exists "household_transactions_read" on public.household_transactions;
create policy "household_transactions_read" on public.household_transactions
for select to authenticated using (public.is_household_member(household_id));
drop policy if exists "household_bills_read" on public.household_bills;
create policy "household_bills_read" on public.household_bills
for select to authenticated using (public.is_household_member(household_id));
drop policy if exists "household_goals_read" on public.household_goals;
create policy "household_goals_read" on public.household_goals
for select to authenticated using (public.is_household_member(household_id));
drop policy if exists "household_contributions_read" on public.household_contributions;
create policy "household_contributions_read" on public.household_contributions
for select to authenticated using (public.is_household_member(household_id));
drop policy if exists "household_activity_read" on public.household_activity;
create policy "household_activity_read" on public.household_activity
for select to authenticated using (public.is_household_member(household_id));

-- Write policies: Owner or Partner with edit permission for that section.
drop policy if exists "household_transactions_write" on public.household_transactions;
create policy "household_transactions_write" on public.household_transactions
for all to authenticated
using (public.household_can_edit(household_id,'transactions'))
with check (public.household_can_edit(household_id,'transactions'));

drop policy if exists "household_bills_write" on public.household_bills;
create policy "household_bills_write" on public.household_bills
for all to authenticated
using (public.household_can_edit(household_id,'bills'))
with check (public.household_can_edit(household_id,'bills'));

drop policy if exists "household_goals_write" on public.household_goals;
create policy "household_goals_write" on public.household_goals
for all to authenticated
using (public.household_can_edit(household_id,'goals'))
with check (public.household_can_edit(household_id,'goals'));

drop policy if exists "household_contributions_write" on public.household_contributions;
create policy "household_contributions_write" on public.household_contributions
for all to authenticated
using (
  user_id = auth.uid()
  or public.household_can_edit(household_id,'contributions')
)
with check (
  user_id = auth.uid()
  or public.household_can_edit(household_id,'contributions')
);

drop policy if exists "household_activity_insert" on public.household_activity;
create policy "household_activity_insert" on public.household_activity
for insert to authenticated
with check (public.is_household_member(household_id) and (user_id = auth.uid() or user_id is null));

create index if not exists household_members_user_idx on public.household_members(user_id);
create index if not exists household_invites_email_idx on public.household_invites(lower(invited_email));
create index if not exists household_transactions_household_date_idx on public.household_transactions(household_id, transaction_date desc);
create index if not exists household_bills_household_idx on public.household_bills(household_id);
create index if not exists household_goals_household_idx on public.household_goals(household_id, sort_order);
create index if not exists household_contributions_household_date_idx on public.household_contributions(household_id, contribution_date desc);
create index if not exists household_activity_household_date_idx on public.household_activity(household_id, created_at desc);

-- ============================================================
-- 5. Offline sync metadata
-- These fields support queue replay and conflict detection.
-- ============================================================
do $$
declare
  tbl text;
begin
  foreach tbl in array array[
    'transactions','bills','savings_goals','debts','assets',
    'household_transactions','household_bills','household_goals','household_contributions'
  ] loop
    execute format('alter table public.%I add column if not exists sync_version bigint not null default 1', tbl);
    execute format('alter table public.%I add column if not exists client_updated_at timestamptz', tbl);
    execute format('alter table public.%I add column if not exists last_device_id text', tbl);
  end loop;
end $$;

-- ============================================================
-- 6. Assistant recommendation history
-- Stores only user-visible recommendations, not external AI secrets.
-- ============================================================
create table if not exists public.assistant_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  mode text not null default 'Budget Coach',
  question text,
  recommendation text not null,
  calculation_summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.assistant_history enable row level security;
drop policy if exists "assistant_history_own_rows" on public.assistant_history;
create policy "assistant_history_own_rows"
on public.assistant_history for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
create index if not exists assistant_history_user_date_idx on public.assistant_history(user_id, created_at desc);

commit;
