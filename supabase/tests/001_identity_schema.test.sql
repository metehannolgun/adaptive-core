begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

select has_table('public', 'profiles', 'profiles exists');
select has_table('public', 'training_preferences', 'training_preferences exists');
select has_table('public', 'privacy_preferences', 'privacy_preferences exists');

select columns_are(
  'public',
  'profiles',
  array['user_id', 'locale', 'created_at', 'updated_at'],
  'profiles contains only the approved public identity fields'
);

select columns_are(
  'public',
  'training_preferences',
  array[
    'user_id',
    'preferred_duration_minutes',
    'sound_enabled',
    'cues_enabled',
    'reminders_enabled',
    'created_at',
    'updated_at'
  ],
  'training_preferences has the approved constrained fields'
);

select columns_are(
  'public',
  'privacy_preferences',
  array['user_id', 'analytics_consent_status', 'created_at', 'updated_at'],
  'privacy_preferences represents pending, granted, or denied consent'
);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  is_anonymous,
  created_at,
  updated_at
)
values (
  '00000000-0000-0000-0000-000000000000',
  '10000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  true,
  now(),
  now()
);

select ok(
  exists (
    select 1 from public.profiles
    where user_id = '10000000-0000-0000-0000-000000000001'
      and locale = 'en'
  ),
  'an anonymous Auth user receives an English-default profile'
);

select ok(
  exists (
    select 1 from public.training_preferences
    where user_id = '10000000-0000-0000-0000-000000000001'
      and preferred_duration_minutes = 10
  ),
  'an anonymous Auth user receives conservative training defaults'
);

select ok(
  exists (
    select 1 from public.privacy_preferences
    where user_id = '10000000-0000-0000-0000-000000000001'
      and analytics_consent_status = 'pending'
  ),
  'analytics remains disabled until the user chooses'
);

select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'email'
  ),
  'email is not duplicated outside Supabase Auth'
);

select * from finish();

rollback;
