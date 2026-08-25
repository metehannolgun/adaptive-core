begin;

create extension if not exists pgtap with schema extensions;

select plan(87);

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
    true,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    false,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-0000-0000-000000000004',
    'authenticated',
    'authenticated',
    false,
    now(),
    now()
  );

select is(
  (
    select count(*)::integer
    from pg_class
    where oid in (
      'public.profiles'::regclass,
      'public.training_preferences'::regclass,
      'public.privacy_preferences'::regclass
    )
      and relrowsecurity
  ),
  3,
  'all identity tables have RLS enabled'
);

select is(
  (
    select count(*)::integer
    from pg_class
    where oid in (
      'public.profiles'::regclass,
      'public.training_preferences'::regclass,
      'public.privacy_preferences'::regclass
    )
      and relforcerowsecurity
  ),
  3,
  'all identity tables force RLS'
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
  'profile creation time cannot be changed by the client'
);

select ok(
  not has_table_privilege('authenticated', 'public.training_preferences', 'INSERT'),
  'authenticated clients cannot create training preferences directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.training_preferences', 'DELETE'),
  'authenticated clients cannot delete training preferences directly'
);

select ok(
  has_column_privilege(
    'authenticated',
    'public.training_preferences',
    'preferred_duration_minutes',
    'UPDATE'
  ),
  'preferred duration is an allowlisted training preference update'
);

select ok(
  not has_column_privilege(
    'authenticated',
    'public.training_preferences',
    'updated_at',
    'UPDATE'
  ),
  'training preference timestamps cannot be changed by the client'
);

select ok(
  not has_table_privilege('authenticated', 'public.privacy_preferences', 'INSERT'),
  'authenticated clients cannot create privacy preferences directly'
);

select ok(
  not has_table_privilege('authenticated', 'public.privacy_preferences', 'DELETE'),
  'authenticated clients cannot delete privacy preferences directly'
);

select ok(
  has_column_privilege(
    'authenticated',
    'public.privacy_preferences',
    'analytics_consent_status',
    'UPDATE'
  ),
  'analytics consent is the allowlisted privacy preference update'
);

select ok(
  not has_column_privilege('authenticated', 'public.privacy_preferences', 'updated_at', 'UPDATE'),
  'privacy preference timestamps cannot be changed by the client'
);

set local "request.jwt.claims" = '{}';
set local role anon;

select throws_ok(
  $$select user_id from public.profiles$$,
  '42501',
  null,
  'a no-session actor cannot read profiles'
);

select throws_ok(
  $$insert into public.profiles (user_id) values ('20000000-0000-0000-0000-000000000001')$$,
  '42501',
  null,
  'a no-session actor cannot insert profiles'
);

select throws_ok(
  $$update public.profiles set locale = 'tr' where user_id = '20000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'a no-session actor cannot update profiles'
);

select throws_ok(
  $$delete from public.profiles where user_id = '20000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'a no-session actor cannot delete profiles'
);

select throws_ok(
  $$select user_id from public.training_preferences$$,
  '42501',
  null,
  'a no-session actor cannot read training preferences'
);

select throws_ok(
  $$insert into public.training_preferences (user_id) values ('20000000-0000-0000-0000-000000000001')$$,
  '42501',
  null,
  'a no-session actor cannot insert training preferences'
);

select throws_ok(
  $$update public.training_preferences set preferred_duration_minutes = 15 where user_id = '20000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'a no-session actor cannot update training preferences'
);

select throws_ok(
  $$delete from public.training_preferences where user_id = '20000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'a no-session actor cannot delete training preferences'
);

select throws_ok(
  $$select user_id from public.privacy_preferences$$,
  '42501',
  null,
  'a no-session actor cannot read privacy preferences'
);

select throws_ok(
  $$insert into public.privacy_preferences (user_id) values ('20000000-0000-0000-0000-000000000001')$$,
  '42501',
  null,
  'a no-session actor cannot insert privacy preferences'
);

select throws_ok(
  $$update public.privacy_preferences set analytics_consent_status = 'denied' where user_id = '20000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'a no-session actor cannot update privacy preferences'
);

select throws_ok(
  $$delete from public.privacy_preferences where user_id = '20000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'a no-session actor cannot delete privacy preferences'
);

reset role;

set local "request.jwt.claims" =
  '{"sub":"20000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":true}';
set local role authenticated;

select results_eq(
  $$select user_id from public.profiles order by user_id$$,
  $$values ('20000000-0000-0000-0000-000000000001'::uuid)$$,
  'guest A reads only its own profile'
);

select results_eq(
  $$select user_id from public.training_preferences order by user_id$$,
  $$values ('20000000-0000-0000-0000-000000000001'::uuid)$$,
  'guest A reads only its own training preferences'
);

select results_eq(
  $$select user_id from public.privacy_preferences order by user_id$$,
  $$values ('20000000-0000-0000-0000-000000000001'::uuid)$$,
  'guest A reads only its own privacy preferences'
);

select results_eq(
  $$with changed as (
      update public.profiles
      set locale = 'tr'
      where user_id = '20000000-0000-0000-0000-000000000001'
      returning locale
    ) select locale from changed$$,
  $$values ('tr'::text)$$,
  'guest A updates its own profile'
);

select results_eq(
  $$with changed as (
      update public.training_preferences
      set preferred_duration_minutes = 15
      where user_id = '20000000-0000-0000-0000-000000000001'
      returning preferred_duration_minutes
    ) select preferred_duration_minutes from changed$$,
  $$values (15::smallint)$$,
  'guest A updates its own training preferences'
);

select results_eq(
  $$with changed as (
      update public.privacy_preferences
      set analytics_consent_status = 'denied'
      where user_id = '20000000-0000-0000-0000-000000000001'
      returning analytics_consent_status
    ) select analytics_consent_status from changed$$,
  $$values ('denied'::text)$$,
  'guest A updates its own privacy preferences'
);

select results_eq(
  $$with attacked as (
      update public.profiles
      set locale = 'tr'
      where user_id <> '20000000-0000-0000-0000-000000000001'
      returning user_id
    ) select user_id from attacked order by user_id$$,
  $$select null::uuid where false$$,
  'guest A cannot update any other profile'
);

select results_eq(
  $$with attacked as (
      update public.training_preferences
      set preferred_duration_minutes = 15
      where user_id <> '20000000-0000-0000-0000-000000000001'
      returning user_id
    ) select user_id from attacked order by user_id$$,
  $$select null::uuid where false$$,
  'guest A cannot update any other training preferences'
);

select results_eq(
  $$with attacked as (
      update public.privacy_preferences
      set analytics_consent_status = 'denied'
      where user_id <> '20000000-0000-0000-0000-000000000001'
      returning user_id
    ) select user_id from attacked order by user_id$$,
  $$select null::uuid where false$$,
  'guest A cannot update any other privacy preferences'
);

select throws_ok(
  $$insert into public.profiles (user_id) values ('20000000-0000-0000-0000-000000000002')$$,
  '42501',
  null,
  'guest A cannot insert a profile for guest B'
);

select throws_ok(
  $$insert into public.training_preferences (user_id) values ('20000000-0000-0000-0000-000000000002')$$,
  '42501',
  null,
  'guest A cannot insert training preferences for guest B'
);

select throws_ok(
  $$insert into public.privacy_preferences (user_id) values ('20000000-0000-0000-0000-000000000002')$$,
  '42501',
  null,
  'guest A cannot insert privacy preferences for guest B'
);

select throws_ok(
  $$delete from public.profiles where user_id <> '20000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'guest A cannot delete other profiles'
);

select throws_ok(
  $$delete from public.training_preferences where user_id <> '20000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'guest A cannot delete other training preferences'
);

select throws_ok(
  $$delete from public.privacy_preferences where user_id <> '20000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'guest A cannot delete other privacy preferences'
);

reset role;

set local "request.jwt.claims" =
  '{"sub":"20000000-0000-0000-0000-000000000002","role":"authenticated","is_anonymous":true}';
set local role authenticated;

select results_eq(
  $$select user_id from public.profiles order by user_id$$,
  $$values ('20000000-0000-0000-0000-000000000002'::uuid)$$,
  'guest B reads only its own profile'
);

select results_eq(
  $$select user_id from public.training_preferences order by user_id$$,
  $$values ('20000000-0000-0000-0000-000000000002'::uuid)$$,
  'guest B reads only its own training preferences'
);

select results_eq(
  $$select user_id from public.privacy_preferences order by user_id$$,
  $$values ('20000000-0000-0000-0000-000000000002'::uuid)$$,
  'guest B reads only its own privacy preferences'
);

select results_eq(
  $$with changed as (
      update public.profiles
      set locale = 'tr'
      where user_id = '20000000-0000-0000-0000-000000000002'
      returning locale
    ) select locale from changed$$,
  $$values ('tr'::text)$$,
  'guest B updates its own profile'
);

select results_eq(
  $$with changed as (
      update public.training_preferences
      set preferred_duration_minutes = 15
      where user_id = '20000000-0000-0000-0000-000000000002'
      returning preferred_duration_minutes
    ) select preferred_duration_minutes from changed$$,
  $$values (15::smallint)$$,
  'guest B updates its own training preferences'
);

select results_eq(
  $$with changed as (
      update public.privacy_preferences
      set analytics_consent_status = 'denied'
      where user_id = '20000000-0000-0000-0000-000000000002'
      returning analytics_consent_status
    ) select analytics_consent_status from changed$$,
  $$values ('denied'::text)$$,
  'guest B updates its own privacy preferences'
);

select results_eq(
  $$with attacked as (
      update public.profiles
      set locale = 'tr'
      where user_id <> '20000000-0000-0000-0000-000000000002'
      returning user_id
    ) select user_id from attacked order by user_id$$,
  $$select null::uuid where false$$,
  'guest B cannot update any other profile'
);

select results_eq(
  $$with attacked as (
      update public.training_preferences
      set preferred_duration_minutes = 15
      where user_id <> '20000000-0000-0000-0000-000000000002'
      returning user_id
    ) select user_id from attacked order by user_id$$,
  $$select null::uuid where false$$,
  'guest B cannot update any other training preferences'
);

select results_eq(
  $$with attacked as (
      update public.privacy_preferences
      set analytics_consent_status = 'denied'
      where user_id <> '20000000-0000-0000-0000-000000000002'
      returning user_id
    ) select user_id from attacked order by user_id$$,
  $$select null::uuid where false$$,
  'guest B cannot update any other privacy preferences'
);

select throws_ok(
  $$insert into public.profiles (user_id) values ('20000000-0000-0000-0000-000000000003')$$,
  '42501',
  null,
  'guest B cannot insert a profile for permanent user A'
);

select throws_ok(
  $$insert into public.training_preferences (user_id) values ('20000000-0000-0000-0000-000000000003')$$,
  '42501',
  null,
  'guest B cannot insert training preferences for permanent user A'
);

select throws_ok(
  $$insert into public.privacy_preferences (user_id) values ('20000000-0000-0000-0000-000000000003')$$,
  '42501',
  null,
  'guest B cannot insert privacy preferences for permanent user A'
);

select throws_ok(
  $$delete from public.profiles where user_id <> '20000000-0000-0000-0000-000000000002'$$,
  '42501',
  null,
  'guest B cannot delete other profiles'
);

select throws_ok(
  $$delete from public.training_preferences where user_id <> '20000000-0000-0000-0000-000000000002'$$,
  '42501',
  null,
  'guest B cannot delete other training preferences'
);

select throws_ok(
  $$delete from public.privacy_preferences where user_id <> '20000000-0000-0000-0000-000000000002'$$,
  '42501',
  null,
  'guest B cannot delete other privacy preferences'
);

reset role;

set local "request.jwt.claims" =
  '{"sub":"20000000-0000-0000-0000-000000000003","role":"authenticated","is_anonymous":false}';
set local role authenticated;

select results_eq(
  $$select user_id from public.profiles order by user_id$$,
  $$values ('20000000-0000-0000-0000-000000000003'::uuid)$$,
  'permanent user A reads only its own profile'
);

select results_eq(
  $$select user_id from public.training_preferences order by user_id$$,
  $$values ('20000000-0000-0000-0000-000000000003'::uuid)$$,
  'permanent user A reads only its own training preferences'
);

select results_eq(
  $$select user_id from public.privacy_preferences order by user_id$$,
  $$values ('20000000-0000-0000-0000-000000000003'::uuid)$$,
  'permanent user A reads only its own privacy preferences'
);

select results_eq(
  $$with changed as (
      update public.profiles
      set locale = 'tr'
      where user_id = '20000000-0000-0000-0000-000000000003'
      returning locale
    ) select locale from changed$$,
  $$values ('tr'::text)$$,
  'permanent user A updates its own profile'
);

select results_eq(
  $$with changed as (
      update public.training_preferences
      set preferred_duration_minutes = 15
      where user_id = '20000000-0000-0000-0000-000000000003'
      returning preferred_duration_minutes
    ) select preferred_duration_minutes from changed$$,
  $$values (15::smallint)$$,
  'permanent user A updates its own training preferences'
);

select results_eq(
  $$with changed as (
      update public.privacy_preferences
      set analytics_consent_status = 'granted'
      where user_id = '20000000-0000-0000-0000-000000000003'
      returning analytics_consent_status
    ) select analytics_consent_status from changed$$,
  $$values ('granted'::text)$$,
  'permanent user A updates its own privacy preferences'
);

select results_eq(
  $$with attacked as (
      update public.profiles
      set locale = 'tr'
      where user_id <> '20000000-0000-0000-0000-000000000003'
      returning user_id
    ) select user_id from attacked order by user_id$$,
  $$select null::uuid where false$$,
  'permanent user A cannot update any other profile'
);

select results_eq(
  $$with attacked as (
      update public.training_preferences
      set preferred_duration_minutes = 15
      where user_id <> '20000000-0000-0000-0000-000000000003'
      returning user_id
    ) select user_id from attacked order by user_id$$,
  $$select null::uuid where false$$,
  'permanent user A cannot update any other training preferences'
);

select results_eq(
  $$with attacked as (
      update public.privacy_preferences
      set analytics_consent_status = 'granted'
      where user_id <> '20000000-0000-0000-0000-000000000003'
      returning user_id
    ) select user_id from attacked order by user_id$$,
  $$select null::uuid where false$$,
  'permanent user A cannot update any other privacy preferences'
);

select throws_ok(
  $$insert into public.profiles (user_id) values ('20000000-0000-0000-0000-000000000004')$$,
  '42501',
  null,
  'permanent user A cannot insert a profile for permanent user B'
);

select throws_ok(
  $$insert into public.training_preferences (user_id) values ('20000000-0000-0000-0000-000000000004')$$,
  '42501',
  null,
  'permanent user A cannot insert training preferences for permanent user B'
);

select throws_ok(
  $$insert into public.privacy_preferences (user_id) values ('20000000-0000-0000-0000-000000000004')$$,
  '42501',
  null,
  'permanent user A cannot insert privacy preferences for permanent user B'
);

select throws_ok(
  $$delete from public.profiles where user_id <> '20000000-0000-0000-0000-000000000003'$$,
  '42501',
  null,
  'permanent user A cannot delete other profiles'
);

select throws_ok(
  $$delete from public.training_preferences where user_id <> '20000000-0000-0000-0000-000000000003'$$,
  '42501',
  null,
  'permanent user A cannot delete other training preferences'
);

select throws_ok(
  $$delete from public.privacy_preferences where user_id <> '20000000-0000-0000-0000-000000000003'$$,
  '42501',
  null,
  'permanent user A cannot delete other privacy preferences'
);

reset role;

set local "request.jwt.claims" =
  '{"sub":"20000000-0000-0000-0000-000000000004","role":"authenticated","is_anonymous":false}';
set local role authenticated;

select results_eq(
  $$select user_id from public.profiles order by user_id$$,
  $$values ('20000000-0000-0000-0000-000000000004'::uuid)$$,
  'permanent user B reads only its own profile'
);

select results_eq(
  $$select user_id from public.training_preferences order by user_id$$,
  $$values ('20000000-0000-0000-0000-000000000004'::uuid)$$,
  'permanent user B reads only its own training preferences'
);

select results_eq(
  $$select user_id from public.privacy_preferences order by user_id$$,
  $$values ('20000000-0000-0000-0000-000000000004'::uuid)$$,
  'permanent user B reads only its own privacy preferences'
);

select results_eq(
  $$with changed as (
      update public.profiles
      set locale = 'tr'
      where user_id = '20000000-0000-0000-0000-000000000004'
      returning locale
    ) select locale from changed$$,
  $$values ('tr'::text)$$,
  'permanent user B updates its own profile'
);

select results_eq(
  $$with changed as (
      update public.training_preferences
      set preferred_duration_minutes = 15
      where user_id = '20000000-0000-0000-0000-000000000004'
      returning preferred_duration_minutes
    ) select preferred_duration_minutes from changed$$,
  $$values (15::smallint)$$,
  'permanent user B updates its own training preferences'
);

select results_eq(
  $$with changed as (
      update public.privacy_preferences
      set analytics_consent_status = 'granted'
      where user_id = '20000000-0000-0000-0000-000000000004'
      returning analytics_consent_status
    ) select analytics_consent_status from changed$$,
  $$values ('granted'::text)$$,
  'permanent user B updates its own privacy preferences'
);

select results_eq(
  $$with attacked as (
      update public.profiles
      set locale = 'tr'
      where user_id <> '20000000-0000-0000-0000-000000000004'
      returning user_id
    ) select user_id from attacked order by user_id$$,
  $$select null::uuid where false$$,
  'permanent user B cannot update any other profile'
);

select results_eq(
  $$with attacked as (
      update public.training_preferences
      set preferred_duration_minutes = 15
      where user_id <> '20000000-0000-0000-0000-000000000004'
      returning user_id
    ) select user_id from attacked order by user_id$$,
  $$select null::uuid where false$$,
  'permanent user B cannot update any other training preferences'
);

select results_eq(
  $$with attacked as (
      update public.privacy_preferences
      set analytics_consent_status = 'granted'
      where user_id <> '20000000-0000-0000-0000-000000000004'
      returning user_id
    ) select user_id from attacked order by user_id$$,
  $$select null::uuid where false$$,
  'permanent user B cannot update any other privacy preferences'
);

select throws_ok(
  $$insert into public.profiles (user_id) values ('20000000-0000-0000-0000-000000000001')$$,
  '42501',
  null,
  'permanent user B cannot insert a profile for guest A'
);

select throws_ok(
  $$insert into public.training_preferences (user_id) values ('20000000-0000-0000-0000-000000000001')$$,
  '42501',
  null,
  'permanent user B cannot insert training preferences for guest A'
);

select throws_ok(
  $$insert into public.privacy_preferences (user_id) values ('20000000-0000-0000-0000-000000000001')$$,
  '42501',
  null,
  'permanent user B cannot insert privacy preferences for guest A'
);

select throws_ok(
  $$delete from public.profiles where user_id <> '20000000-0000-0000-0000-000000000004'$$,
  '42501',
  null,
  'permanent user B cannot delete other profiles'
);

select throws_ok(
  $$delete from public.training_preferences where user_id <> '20000000-0000-0000-0000-000000000004'$$,
  '42501',
  null,
  'permanent user B cannot delete other training preferences'
);

select throws_ok(
  $$delete from public.privacy_preferences where user_id <> '20000000-0000-0000-0000-000000000004'$$,
  '42501',
  null,
  'permanent user B cannot delete other privacy preferences'
);

select throws_ok(
  $$
    update public.privacy_preferences
    set analytics_consent_status = 'pending'
    where user_id = '20000000-0000-0000-0000-000000000004'
  $$,
  '42501',
  null,
  'a client cannot restore the server-created pending analytics state'
);

reset role;

select * from finish();

rollback;
