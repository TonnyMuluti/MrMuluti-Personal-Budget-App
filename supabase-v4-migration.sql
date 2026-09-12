-- S&T Budget App v4.0 migration
-- Safe to run once after the existing v3.1 schema.

alter table public.transactions
  add column if not exists is_recurring boolean not null default false,
  add column if not exists recurrence_frequency text,
  add column if not exists next_recurrence_date date;

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  asset_type text not null default 'Other',
  current_value numeric not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  theme text not null default 'system',
  accent text not null default 'blue',
  payday_day integer not null default 25 check (payday_day between 1 and 31),
  notifications_enabled boolean not null default true,
  custom_categories jsonb not null default '["Groceries","Transport","Entertainment","Health","Education","Other"]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.assets enable row level security;
alter table public.user_preferences enable row level security;

drop policy if exists "assets_own_rows" on public.assets;
create policy "assets_own_rows" on public.assets for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "preferences_own_row" on public.user_preferences;
create policy "preferences_own_row" on public.user_preferences for all to authenticated
using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists assets_user_id_idx on public.assets(user_id);
