create schema if not exists private;

revoke all on schema private from public, anon, authenticated;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  locale text not null default 'en'
    check (locale in ('en', 'tr')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.training_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_duration_minutes smallint not null default 10
    check (preferred_duration_minutes in (5, 10, 15)),
  sound_enabled boolean not null default true,
  cues_enabled boolean not null default true,
  reminders_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.privacy_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  analytics_consent_status text not null default 'pending'
    check (analytics_consent_status in ('pending', 'granted', 'denied')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.training_preferences enable row level security;
alter table public.training_preferences force row level security;
alter table public.privacy_preferences enable row level security;
alter table public.privacy_preferences force row level security;

revoke all on public.profiles from public, anon, authenticated;
revoke all on public.training_preferences from public, anon, authenticated;
revoke all on public.privacy_preferences from public, anon, authenticated;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger training_preferences_set_updated_at
before update on public.training_preferences
for each row execute function private.set_updated_at();

create trigger privacy_preferences_set_updated_at
before update on public.privacy_preferences
for each row execute function private.set_updated_at();

create or replace function private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id)
  values (new.id);

  insert into public.training_preferences (user_id)
  values (new.id);

  insert into public.privacy_preferences (user_id)
  values (new.id);

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_auth_user();

revoke all on function private.set_updated_at() from public, anon, authenticated;
revoke all on function private.handle_new_auth_user() from public, anon, authenticated;
