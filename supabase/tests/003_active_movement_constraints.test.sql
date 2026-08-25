begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

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
    false,
    now(),
    now()
  );

select ok(
  not has_table_privilege('anon', 'public.active_movement_constraints', 'SELECT'),
  'unauthenticated requests cannot read movement constraints'
);

select ok(
  not has_table_privilege('authenticated', 'public.active_movement_constraints', 'UPDATE'),
  'constraints are replaced rather than edited in place'
);

set local "request.jwt.claims" =
  '{"sub":"30000000-0000-0000-0000-000000000001","role":"authenticated","is_anonymous":true}';
set local role authenticated;

insert into public.active_movement_constraints (
  user_id,
  body_area,
  reason,
  source
)
values (
  '30000000-0000-0000-0000-000000000001',
  'lower_back',
  'pain_or_discomfort',
  'onboarding'
);

select lives_ok(
  $$
    insert into public.active_movement_constraints (
      user_id,
      body_area,
      reason,
      source
    )
    values (
      '30000000-0000-0000-0000-000000000001',
      'knees',
      'ongoing_limitation',
      'settings'
    )
  $$,
  'owner can add a second predefined active constraint'
);

select throws_ok(
  $$
    insert into public.active_movement_constraints (
      user_id,
      body_area,
      reason,
      source
    )
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
    insert into public.active_movement_constraints (
      user_id,
      body_area,
      reason,
      source
    )
    values (
      '30000000-0000-0000-0000-000000000002',
      'neck',
      'pain_or_discomfort',
      'onboarding'
    )
  $$,
  '42501',
  null,
  'guest A cannot create a constraint for permanent user B'
);

select results_eq(
  $$select body_area from public.active_movement_constraints order by body_area$$,
  $$values ('knees'::text), ('lower_back'::text)$$,
  'guest A reads only its own active constraints'
);

delete from public.active_movement_constraints
where user_id = '30000000-0000-0000-0000-000000000001'
  and body_area = 'knees';

reset role;

select ok(
  not exists (
    select 1 from public.active_movement_constraints
    where user_id = '30000000-0000-0000-0000-000000000001'
      and body_area = 'knees'
  ),
  'owner can clear an active constraint'
);

select ok(
  exists (
    select 1 from public.active_movement_constraints
    where user_id = '30000000-0000-0000-0000-000000000001'
      and body_area = 'lower_back'
  ),
  'clearing one area does not erase unrelated constraints'
);

select * from finish();

rollback;
