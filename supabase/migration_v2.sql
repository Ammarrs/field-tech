-- Run once in Supabase SQL Editor, AFTER the original schema.sql.
-- Run this BEFORE deploying the new frontend and Edge Function.

-- 1) Usernames for login
alter table profiles add column if not exists username text unique;

-- 2) Custom expense categories
create table if not exists expense_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

alter table expense_categories enable row level security;
create policy "read own or admin" on expense_categories
  for select using (user_id = auth.uid() or public.is_admin());
create policy "insert own" on expense_categories
  for insert with check (user_id = auth.uid());
create policy "update own" on expense_categories
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "delete own" on expense_categories
  for delete using (user_id = auth.uid());

-- 3) Expenses: new shape
alter table expenses
  add column if not exists category text not null default 'transport',
  add column if not exists kind text not null default 'personal' check (kind in ('company', 'personal')),
  add column if not exists from_place text,
  add column if not exists to_place text,
  add column if not exists item_name text,
  add column if not exists description text,
  add column if not exists amount numeric not null default 0 check (amount >= 0);

-- Move old data into the new columns (one-time conversion)
update expenses set
  amount = coalesce(transport, 0) + coalesce((
    select sum((t->>'price')::numeric)
    from jsonb_array_elements(coalesce(tools, '[]'::jsonb)) as t
  ), 0),
  from_place = place_visited,
  category = 'transport',
  kind = 'personal';

alter table expenses
  drop column if exists transport,
  drop column if exists tools,
  drop column if exists place_visited;

-- 4) Payments: partial amount + "covered" flag instead of paid
alter table payment_weeks
  add column if not exists received_amount numeric not null default 0 check (received_amount >= 0),
  add column if not exists covered boolean not null default false;
update payment_weeks set covered = paid where paid;
alter table payment_weeks drop column if exists paid;

alter table payment_months
  add column if not exists received_amount numeric not null default 0 check (received_amount >= 0),
  add column if not exists covered boolean not null default false;
update payment_months set covered = paid where paid;
alter table payment_months drop column if exists paid;