begin;

create extension if not exists pgtap with schema extensions;

select plan(13);

insert into auth.users (instance_id, id, aud, role, is_anonymous, created_at, updated_at)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    true,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    false,
    now(),
    now()
  );

select ok(
  (select relrowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'profiles has RLS enabled'
);

select ok(
  (select relforcerowsecurity from pg_class where oid = 'public.profiles'::regclass),
  'profiles forces RLS'
);

select ok(
  not has_table_privilege('anon', 'public.profiles', 'SELECT'),
  'unauthenticated anon role has no profile read grant'
);

select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'INSERT'),
  'authenticated clients cannot create profiles directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.profiles', 'DELETE'),
  'authenticated clients cannot delete profiles directly'
);

select ok(
  has_column_privilege('authenticated', 'public.profiles', 'locale', 'UPDATE'),
  'locale is an allowlisted profile update'
);

select ok(
  not has_column_privilege('authenticated', 'public.profiles', 'created_at', 'UPDATE'),
  'created_at cannot be changed by the client'
);

set local "request.jwt.claims" =
  '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":true}';
set local role authenticated;

select results_eq(
  $$select user_id from public.profiles order by user_id$$,
  $$values ('20000000-0000-0000-0000-000000000001'::uuid)$$,
  'guest A reads only its own profile'
);

update public.profiles
set locale = 'tr'
where user_id = '20000000-0000-0000-0000-000000000001';

update public.profiles
set locale = 'tr'
where user_id = '20000000-0000-0000-0000-000000000002';

reset role;

select is(
  (select locale from public.profiles where user_id = '20000000-0000-0000-0000-000000000001'),
  'tr',
  'guest A updates its own locale'
);

select is(
  (select locale from public.profiles where user_id = '20000000-0000-0000-0000-000000000002'),
  'en',
  'guest A cannot update permanent user B'
);

set local "request.jwt.claims" =
  '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated","is_anonymous":false}';
set local role authenticated;

update public.training_preferences
set preferred_duration_minutes = 15,
    reminders_enabled = true
where user_id = '20000000-0000-0000-0000-000000000002';

update public.privacy_preferences
set analytics_consent_status = 'granted'
where user_id = '20000000-0000-0000-0000-000000000002';

select throws_ok(
  $$
    update public.privacy_preferences
    set analytics_consent_status = 'pending'
    where user_id = '20000000-0000-0000-0000-000000000002'
  $$,
  '42501',
  null,
  'a client cannot restore the server-created pending state'
);

reset role;

select ok(
  exists (
    select 1 from public.training_preferences
    where user_id = '20000000-0000-0000-0000-000000000002'
      and preferred_duration_minutes = 15
      and reminders_enabled
  ),
  'permanent user B updates its own training preferences'
);

select is(
  (
    select analytics_consent_status
    from public.privacy_preferences
    where user_id = '20000000-0000-0000-0000-000000000002'
  ),
  'granted',
  'permanent user B can explicitly grant analytics consent'
);

select * from finish();

rollback;
