-- Run this in Supabase: SQL Editor > New query > Run

-- 1. Profiles: one row per user, with role and active flag
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text not null,
  role text not null default 'technician' check (role in ('technician', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- 2. Helper: is the current user an active admin? (security definer avoids RLS recursion)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin' and active
  );
$$;

-- 3. Data tables. Every row belongs to a user.
create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  governorate text not null,
  floor text,
  room text,
  rack text,
  install_date date,
  status text not null default 'installed' check (status in ('installed', 'pending', 'issue')),
  created_at timestamptz not null default now()
);

create table if not exists installations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  branch_id uuid references branches on delete set null,
  printers int not null check (printers > 0),
  rate numeric not null check (rate > 0),
  created_at timestamptz not null default now()
);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  date date not null,
  governorate text not null,
  branch_id uuid references branches on delete set null,
  place_visited text,
  transport numeric not null default 0 check (transport >= 0),
  tools jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists payment_weeks (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  week_start date not null,
  paid boolean not null default false,
  primary key (user_id, week_start)
);

create table if not exists payment_months (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  month_key text not null,
  paid boolean not null default false,
  primary key (user_id, month_key)
);

create table if not exists settings (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  daily_rate numeric not null default 200,
  pay_percent numeric not null default 50 check (pay_percent between 0 and 100)
);

create index if not exists installations_user_date on installations (user_id, date);
create index if not exists expenses_user_date on expenses (user_id, date);

-- 4. Row Level Security
alter table profiles enable row level security;

-- Users read their own profile, admins read all. No client writes: only the Edge Function
-- (service role) can insert or update profiles.
create policy "profiles read own or admin" on profiles
  for select using (id = auth.uid() or public.is_admin());

do $$
declare t text;
begin
  foreach t in array array['branches', 'installations', 'expenses', 'payment_weeks', 'payment_months', 'settings']
  loop
    execute format('alter table %I enable row level security', t);

    -- Owners read their rows. Admins read everything (for the activity dashboard).
    execute format(
      'create policy "read own or admin" on %I for select using (user_id = auth.uid() or public.is_admin())', t);

    -- Owners write only their own rows. Admins cannot change technicians' data.
    execute format(
      'create policy "insert own" on %I for insert with check (user_id = auth.uid())', t);
    execute format(
      'create policy "update own" on %I for update using (user_id = auth.uid()) with check (user_id = auth.uid())', t);
    execute format(
      'create policy "delete own" on %I for delete using (user_id = auth.uid())', t);
  end loop;
end $$;

-- 5. Bootstrap the first admin.
-- First create your user in Supabase: Authentication > Users > Add user (tick "Auto Confirm").
-- Then run this, replacing the email:
--
-- insert into profiles (id, email, full_name, role)
-- select id, email, 'الأدمن', 'admin' from auth.users where email = 'you@example.com';
