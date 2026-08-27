-- ============================================================================
--  HabitFlow — Supabase database schema
--
--  HOW TO USE
--  1. Create a project at https://supabase.com
--  2. Authentication → Providers → enable "Email"
--     (for a course demo you may disable "Confirm email" so sign-up is instant)
--  3. SQL Editor → New query → paste this whole file → Run
--  4. Project Settings → API:
--        copy "Project URL" + "anon public" key  → frontend/.env
--        copy "service_role" key (secret!)       → backend/.env
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. PROFILES  (one row per auth user, created automatically on sign-up)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  name       text not null default '',
  email      text,
  created_at timestamptz not null default now()
);

-- auto-create a profile whenever a new user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 2. HABITS
-- ---------------------------------------------------------------------------
create table if not exists public.habits (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  name          text not null check (char_length(name) between 1 and 60),
  description   text check (description is null or char_length(description) <= 200),
  category      text not null default 'personal'
                check (category in ('health', 'learning', 'productivity', 'personal')),
  icon          text not null default 'leaf',
  color         text not null default 'leaf',
  weekdays      int[] not null default '{0,1,2,3,4,5,6}',
  goal_value    numeric check (goal_value is null or goal_value > 0),
  goal_unit     text,
  reminder_time text check (reminder_time is null or reminder_time ~ '^\d{2}:\d{2}$'),
  start_date    date not null default current_date,
  status        text not null default 'active'
                check (status in ('active', 'paused', 'archived')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists habits_user_idx on public.habits (user_id);

-- ---------------------------------------------------------------------------
-- 3. HABIT LOGS  (daily tracking records — the heart of the app)
-- ---------------------------------------------------------------------------
create table if not exists public.habit_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  habit_id   uuid not null references public.habits (id) on delete cascade,
  log_date   date not null,
  completed  boolean not null default false,
  value      numeric check (value is null or value >= 0),
  skipped    boolean not null default false,
  logged_at  timestamptz not null default now(),
  unique (habit_id, log_date)
);

create index if not exists habit_logs_user_idx  on public.habit_logs (user_id);
create index if not exists habit_logs_habit_idx on public.habit_logs (habit_id, log_date);

-- ---------------------------------------------------------------------------
-- 4. USER SETTINGS  (theme, week start, notification prefs…)
-- ---------------------------------------------------------------------------
create table if not exists public.user_settings (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  theme         text not null default 'light' check (theme in ('light', 'dark')),
  week_start    int  not null default 1 check (week_start in (0, 1)),
  notifications boolean not null default false,
  coach_tips    boolean not null default true,
  updated_at    timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 5. UPDATED_AT trigger (habits + user_settings)
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists habits_touch on public.habits;
create trigger habits_touch before update on public.habits
  for each row execute function public.touch_updated_at();

drop trigger if exists settings_touch on public.user_settings;
create trigger settings_touch before update on public.user_settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY  (each user can only read/write their own rows)
-- ---------------------------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.habits        enable row level security;
alter table public.habit_logs    enable row level security;
alter table public.user_settings enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- habits
drop policy if exists "habits_all_own" on public.habits;
create policy "habits_all_own" on public.habits
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- habit_logs
drop policy if exists "logs_all_own" on public.habit_logs;
create policy "logs_all_own" on public.habit_logs
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- user_settings
drop policy if exists "settings_all_own" on public.user_settings;
create policy "settings_all_own" on public.user_settings
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ============================================================================
-- Done! Signup/login is handled by Supabase Auth (frontend supabase-js or the
-- Express routes in backend/server.js). All account activity — habits, daily
-- logs, profile and settings — is now stored per user and protected by RLS.
-- ============================================================================
