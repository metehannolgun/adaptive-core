begin;

create extension if not exists pgtap with schema extensions;

select plan(39);

select has_table(
  'public',
  'active_movement_constraints',
  'active_movement_constraints exists'
);

insert into auth.users (instance_id, id, aud, role, is_anonymous, created_at, updated_at)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '30000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    true,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '30000000-0000-0000-0000-000000000002',
    'authenticated',
    'authenticated',
    true,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '30000000-0000-0000-0000-000000000003',
    'authenticated',
    'authenticated',
    false,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '30000000-0000-0000-0000-000000000004',
    'authenticated',
    'authenticated',
    false,
    now(),
    now()
  );

insert into public.active_movement_constraints (user_id, body_area, reason, source)
values
  (
    '30000000-0000-0000-0000-000000000001',
    'lower_back',
    'pain_or_discomfort',
    'onboarding'
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    'lower_back',
    'pain_or_discomfort',
    'onboarding'
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    'lower_back',
    'pain_or_discomfort',
    'onboarding'
  ),
  (
    '30000000-0000-0000-0000-000000000004',
    'lower_back',
    'pain_or_discomfort',
    'onboarding'
  );

select ok(
  (select relrowsecurity from pg_class where oid = 'public.active_movement_constraints'::regclass),
  'active movement constraints has RLS enabled'
);

select ok(
  (select relforcerowsecurity from pg_class where oid = 'public.active_movement_constraints'::regclass),
  'active movement constraints forces RLS'
);

select ok(
  not has_table_privilege('anon', 'public.active_movement_constraints', 'SELECT'),
  'unauthenticated requests have no movement constraint read grant'
);

select ok(
  has_table_privilege('authenticated', 'public.active_movement_constraints', 'SELECT'),
  'authenticated clients have the required movement constraint read grant'
);

select ok(
  has_column_privilege(
    'authenticated',
    'public.active_movement_constraints',
    'user_id',
    'INSERT'
  ),
  'authenticated clients have the required allowlisted insert grant'
);

select ok(
  has_table_privilege('authenticated', 'public.active_movement_constraints', 'DELETE'),
  'authenticated clients have the required movement constraint delete grant'
);

select ok(
  not has_table_privilege('authenticated', 'public.active_movement_constraints', 'UPDATE'),
  'constraints are replaced rather than edited in place'
);

set local "request.jwt.claims" = '{}';
set local role anon;

select throws_ok(
  $$select user_id from public.active_movement_constraints$$,
  '42501',
  null,
  'a no-session actor cannot read active movement constraints'
);

select throws_ok(
  $$
    insert into public.active_movement_constraints (user_id, body_area, reason, source)
    values (
      '30000000-0000-0000-0000-000000000001',
      'hips',
      'ongoing_limitation',
      'settings'
    )
  $$,
  '42501',
  null,
  'a no-session actor cannot insert active movement constraints'
);

select throws_ok(
  $$
    update public.active_movement_constraints
    set reason = 'ongoing_limitation'
    where user_id = '30000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  null,
  'a no-session actor cannot update active movement constraints'
);

select throws_ok(
  $$
    delete from public.active_movement_constraints
    where user_id = '30000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  null,
  'a no-session actor cannot delete active movement constraints'
);

reset role;

set local "request.jwt.claims" =
  '{"sub":"30000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":true}';
set local role authenticated;

select throws_ok(
  $$
    insert into public.active_movement_constraints (user_id, body_area, reason, source)
    values (
      '30000000-0000-0000-0000-000000000001',
      'free text body area',
      'pain_or_discomfort',
      'settings'
    )
  $$,
  '23514',
  null,
  'free-text body area is rejected'
);

select throws_ok(
  $$
    insert into public.active_movement_constraints (user_id, body_area, reason, source)
    values (
      '30000000-0000-0000-0000-000000000001',
      'hips',
      'free text reason',
      'settings'
    )
  $$,
  '23514',
  null,
  'free-text reason is rejected'
);

select throws_ok(
  $$
    insert into public.active_movement_constraints (user_id, body_area, reason, source)
    values (
      '30000000-0000-0000-0000-000000000001',
      'hips',
      'ongoing_limitation',
      'free text source'
    )
  $$,
  '23514',
  null,
  'free-text source is rejected'
);

select results_eq(
  $$select user_id from public.active_movement_constraints order by user_id$$,
  $$values ('30000000-0000-0000-0000-000000000001'::uuid)$$,
  'guest A reads only its own active movement constraints'
);

select results_eq(
  $$with inserted as (
      insert into public.active_movement_constraints (user_id, body_area, reason, source)
      values (
        '30000000-0000-0000-0000-000000000001',
        'knees',
        'ongoing_limitation',
        'settings'
      )
      returning body_area
    ) select body_area from inserted$$,
  $$values ('knees'::text)$$,
  'guest A inserts its own active movement constraint'
);

select throws_ok(
  $$
    insert into public.active_movement_constraints (user_id, body_area, reason, source)
    values (
      '30000000-0000-0000-0000-000000000002',
      'shoulders',
      'ongoing_limitation',
      'settings'
    )
  $$,
  '42501',
  null,
  'guest A cannot insert an active movement constraint for guest B'
);

select throws_ok(
  $$
    update public.active_movement_constraints
    set reason = 'ongoing_limitation'
    where user_id = '30000000-0000-0000-0000-000000000001'
  $$,
  '42501',
  null,
  'guest A cannot update active movement constraints in place'
);

select results_eq(
  $$with attacked as (
      delete from public.active_movement_constraints
      where user_id <> '30000000-0000-0000-0000-000000000001'
      returning user_id
    ) select user_id from attacked order by user_id$$,
  $$select null::uuid where false$$,
  'guest A cannot delete any other user active movement constraints'
);

select results_eq(
  $$with deleted as (
      delete from public.active_movement_constraints
      where user_id = '30000000-0000-0000-0000-000000000001'
        and body_area = 'knees'
      returning body_area
    ) select body_area from deleted$$,
  $$values ('knees'::text)$$,
  'guest A deletes its own active movement constraint'
);

reset role;

set local "request.jwt.claims" =
  '{"sub":"30000000-0000-0000-0000-000000000002","role":"authenticated","is_anonymous":true}';
set local role authenticated;

select results_eq(
  $$select user_id from public.active_movement_constraints order by user_id$$,
  $$values ('30000000-0000-0000-0000-000000000002'::uuid)$$,
  'guest B reads only its own active movement constraints'
);

select results_eq(
  $$with inserted as (
      insert into public.active_movement_constraints (user_id, body_area, reason, source)
      values (
        '30000000-0000-0000-0000-000000000002',
        'knees',
        'ongoing_limitation',
        'settings'
      )
      returning body_area
    ) select body_area from inserted$$,
  $$values ('knees'::text)$$,
  'guest B inserts its own active movement constraint'
);

select throws_ok(
  $$
    insert into public.active_movement_constraints (user_id, body_area, reason, source)
    values (
      '30000000-0000-0000-0000-000000000003',
      'shoulders',
      'ongoing_limitation',
      'settings'
    )
  $$,
  '42501',
  null,
  'guest B cannot insert an active movement constraint for permanent user A'
);

select throws_ok(
  $$
    update public.active_movement_constraints
    set reason = 'ongoing_limitation'
    where user_id = '30000000-0000-0000-0000-000000000002'
  $$,
  '42501',
  null,
  'guest B cannot update active movement constraints in place'
);

select results_eq(
  $$with attacked as (
      delete from public.active_movement_constraints
      where user_id <> '30000000-0000-0000-0000-000000000002'
      returning user_id
    ) select user_id from attacked order by user_id$$,
  $$select null::uuid where false$$,
  'guest B cannot delete any other user active movement constraints'
);

select results_eq(
  $$with deleted as (
      delete from public.active_movement_constraints
      where user_id = '30000000-0000-0000-0000-000000000002'
        and body_area = 'knees'
      returning body_area
    ) select body_area from deleted$$,
  $$values ('knees'::text)$$,
  'guest B deletes its own active movement constraint'
);

reset role;

set local "request.jwt.claims" =
  '{"sub":"30000000-0000-0000-0000-000000000003","role":"authenticated","is_anonymous":false}';
set local role authenticated;

select results_eq(
  $$select user_id from public.active_movement_constraints order by user_id$$,
  $$values ('30000000-0000-0000-0000-000000000003'::uuid)$$,
  'permanent user A reads only its own active movement constraints'
);

select results_eq(
  $$with inserted as (
      insert into public.active_movement_constraints (user_id, body_area, reason, source)
      values (
        '30000000-0000-0000-0000-000000000003',
        'knees',
        'ongoing_limitation',
        'settings'
      )
      returning body_area
    ) select body_area from inserted$$,
  $$values ('knees'::text)$$,
  'permanent user A inserts its own active movement constraint'
);

select throws_ok(
  $$
    insert into public.active_movement_constraints (user_id, body_area, reason, source)
    values (
      '30000000-0000-0000-0000-000000000004',
      'shoulders',
      'ongoing_limitation',
      'settings'
    )
  $$,
  '42501',
  null,
  'permanent user A cannot insert an active movement constraint for permanent user B'
);

select throws_ok(
  $$
    update public.active_movement_constraints
    set reason = 'ongoing_limitation'
    where user_id = '30000000-0000-0000-0000-000000000003'
  $$,
  '42501',
  null,
  'permanent user A cannot update active movement constraints in place'
);

select results_eq(
  $$with attacked as (
      delete from public.active_movement_constraints
      where user_id <> '30000000-0000-0000-0000-000000000003'
      returning user_id
    ) select user_id from attacked order by user_id$$,
  $$select null::uuid where false$$,
  'permanent user A cannot delete any other user active movement constraints'
);

select results_eq(
  $$with deleted as (
      delete from public.active_movement_constraints
      where user_id = '30000000-0000-0000-0000-000000000003'
        and body_area = 'knees'
      returning body_area
    ) select body_area from deleted$$,
  $$values ('knees'::text)$$,
  'permanent user A deletes its own active movement constraint'
);

reset role;

set local "request.jwt.claims" =
  '{"sub":"30000000-0000-0000-0000-000000000004","role":"authenticated","is_anonymous":false}';
set local role authenticated;

select results_eq(
  $$select user_id from public.active_movement_constraints order by user_id$$,
  $$values ('30000000-0000-0000-0000-000000000004'::uuid)$$,
  'permanent user B reads only its own active movement constraints'
);

select results_eq(
  $$with inserted as (
      insert into public.active_movement_constraints (user_id, body_area, reason, source)
      values (
        '30000000-0000-0000-0000-000000000004',
        'knees',
        'ongoing_limitation',
        'settings'
      )
      returning body_area
    ) select body_area from inserted$$,
  $$values ('knees'::text)$$,
  'permanent user B inserts its own active movement constraint'
);

select throws_ok(
  $$
    insert into public.active_movement_constraints (user_id, body_area, reason, source)
    values (
      '30000000-0000-0000-0000-000000000001',
      'shoulders',
      'ongoing_limitation',
      'settings'
    )
  $$,
  '42501',
  null,
  'permanent user B cannot insert an active movement constraint for guest A'
);

select throws_ok(
  $$
    update public.active_movement_constraints
    set reason = 'ongoing_limitation'
    where user_id = '30000000-0000-0000-0000-000000000004'
  $$,
  '42501',
  null,
  'permanent user B cannot update active movement constraints in place'
);

select results_eq(
  $$with attacked as (
      delete from public.active_movement_constraints
      where user_id <> '30000000-0000-0000-0000-000000000004'
      returning user_id
    ) select user_id from attacked order by user_id$$,
  $$select null::uuid where false$$,
  'permanent user B cannot delete any other user active movement constraints'
);

select results_eq(
  $$with deleted as (
      delete from public.active_movement_constraints
      where user_id = '30000000-0000-0000-0000-000000000004'
        and body_area = 'knees'
      returning body_area
    ) select body_area from deleted$$,
  $$values ('knees'::text)$$,
  'permanent user B deletes its own active movement constraint'
);

reset role;

select * from finish();

rollback;
