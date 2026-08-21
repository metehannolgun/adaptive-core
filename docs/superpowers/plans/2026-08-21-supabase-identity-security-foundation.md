# Supabase Identity Security Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the reproducible local Supabase foundation and the first four deny-by-default, user-owned identity tables with executable RLS tests.

**Architecture:** Supabase CLI 2.111.0 runs Auth and PostgreSQL locally in containers. Versioned SQL migrations create minimal identity data, provision defaults from `auth.users`, revoke broad access, and grant only owner-scoped operations through RLS; pgTAP proves both allowed and forbidden behavior before any mobile repository is added.

**Tech Stack:** Supabase CLI 2.111.0, PostgreSQL 15, Supabase Auth, Row Level Security, pgTAP, npm

**Spec:** `docs/superpowers/specs/2026-08-21-identity-and-data-security-design.md`

## Global Constraints

- V1 permanent sign-in is email plus a six-digit OTP; local OTP expiry is exactly 600 seconds.
- Guest identity uses Supabase anonymous Auth and the verified `is_anonymous` JWT claim.
- Every exposed user-owned table has RLS enabled and defaults to denial.
- Ownership is always `(select auth.uid()) = user_id`; request-supplied metadata never authorizes access.
- The client receives no direct profile insert/delete permission and no service-role secret.
- Email remains only in Supabase Auth and is not duplicated in `public.profiles`.
- Analytics starts disabled; only `granted` enables it.
- Active movement constraints use a closed body-area and reason vocabulary with no free text.
- This plan does not add workout history, Edge Functions, mobile Supabase calls, profile UI, Apple/Google providers, or production deployment.
- Node.js 20 or newer and a running Docker-compatible container runtime are prerequisites.
- Preserve the pure TypeScript engine boundary: no Supabase import enters `src/engine/`.
- Do not stage or modify `.superpowers/` or `docs/superpowers/plans/2026-08-14-feedback-reducer.md`.

---

## File Map

| File | Responsibility |
| --- | --- |
| `package.json` | Pin local Supabase commands used by every developer and CI job. |
| `package-lock.json` | Lock Supabase CLI 2.111.0 and its dependency graph. |
| `.gitignore` | Prevent local Supabase state and environment secrets from entering Git. |
| `supabase/config.toml` | Reproducible local Auth, OTP, anonymous-user, API, and PostgreSQL configuration. |
| `supabase/migrations/20260821000100_identity_core.sql` | Create private trigger helpers plus profiles, training preferences, and privacy preferences with deny-by-default RLS. |
| `supabase/migrations/20260821000200_identity_rls.sql` | Add column-level grants and owner-only RLS policies for identity data. |
| `supabase/migrations/20260821000300_active_movement_constraints.sql` | Add the closed-vocabulary active safety constraint table, grants, and RLS. |
| `supabase/tests/000_environment.test.sql` | Prove the local database test harness and required pgTAP extension work. |
| `supabase/tests/001_identity_schema.test.sql` | Prove table shape and automatic Auth-user provisioning. |
| `supabase/tests/002_identity_rls.test.sql` | Prove owner access, cross-user denial, and column-level grants. |
| `supabase/tests/003_active_movement_constraints.test.sql` | Prove safe vocabulary, owner operations, and cross-user denial. |
| `src/database/database.types.ts` | Generated TypeScript view of the tested local schema for later repositories. |

---

### Task 1: Reproducible Local Supabase Harness

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `.gitignore`
- Create: `supabase/config.toml` via the CLI, then modify its Auth values
- Create: `supabase/tests/000_environment.test.sql`

**Interfaces:**
- Consumes: Node.js 20+ and a running Docker-compatible container runtime.
- Produces: `npm run db:start`, `npm run db:stop`, `npm run db:reset`, `npm run db:test`, and `npm run db:lint`.

- [ ] **Step 1: Verify prerequisites without changing the repository**

Run:

```bash
node --version
docker version
```

Expected: Node prints `v20` or newer, and Docker prints both Client and Server sections. Stop this task if the Docker Server is unavailable; do not replace the local test database with an untested remote project.

- [ ] **Step 2: Install and pin the project-local CLI**

Run:

```bash
npm install --save-dev --save-exact supabase@2.111.0
```

Expected: `package.json` contains `"supabase": "2.111.0"` under `devDependencies`, and `package-lock.json` changes.

- [ ] **Step 3: Initialize the local Supabase directory**

Run:

```bash
npx supabase init
```

Expected: `supabase/config.toml` is created. Do not run `supabase link`; this plan has no authority to touch a remote project.

- [ ] **Step 4: Configure the approved local identity controls**

In the generated `supabase/config.toml`, set these exact values in the existing sections:

```toml
project_id = "adaptive-core"

[db]
major_version = 15

[auth]
enabled = true
site_url = "adaptivecore://auth"
additional_redirect_urls = ["adaptivecore://auth/callback"]
jwt_expiry = 3600
enable_signup = true
enable_anonymous_sign_ins = true
enable_manual_linking = false
enable_refresh_token_rotation = true
refresh_token_reuse_interval = 10

[auth.rate_limit]
anonymous_users = 30
sign_in_sign_ups = 30
token_refresh = 150
token_verifications = 30

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = true
otp_length = 6
otp_expiry = 600
```

Keep the generated local Inbucket SMTP settings. Do not add an SMTP password, OAuth secret, service-role key, or production project reference.

- [ ] **Step 5: Add safe local-state ignores**

Append these exact lines to `.gitignore`:

```gitignore
.env
.env.*
!.env.example
supabase/.branches/
supabase/.temp/
supabase/.env
```

- [ ] **Step 6: Add database scripts**

Add these exact entries under `scripts` in `package.json`:

```json
"db:start": "supabase start",
"db:stop": "supabase stop",
"db:reset": "supabase db reset --local",
"db:test": "supabase test db --local",
"db:lint": "supabase db lint --local --level warning"
```

- [ ] **Step 7: Start the local stack**

Run:

```bash
npm run db:start
```

Expected: Supabase reports healthy local API, database, Studio, and Inbucket services. The first run may download container images.

- [ ] **Step 8: Add the database harness test**

Create `supabase/tests/000_environment.test.sql`:

```sql
begin;

create extension if not exists pgtap with schema extensions;

select plan(2);

select ok(
  current_setting('server_version_num')::integer >= 150000,
  'PostgreSQL 15 or newer is running'
);

select has_extension(
  'pgtap',
  'pgTAP is available for database security tests'
);

select * from finish();

rollback;
```

- [ ] **Step 9: Run the harness test**

Run:

```bash
npm run db:test -- supabase/tests/000_environment.test.sql
```

Expected: one pgTAP file passes with two assertions.

- [ ] **Step 10: Commit the local harness**

Run:

```bash
git add package.json package-lock.json .gitignore supabase/config.toml supabase/tests/000_environment.test.sql
git commit -m "chore: add local Supabase test harness"
```

---

### Task 2: Deny-by-Default Identity Schema and Provisioning

**Files:**
- Create: `supabase/tests/001_identity_schema.test.sql`
- Create: `supabase/migrations/20260821000100_identity_core.sql`

**Interfaces:**
- Consumes: Local Supabase Auth schema and pgTAP harness from Task 1.
- Produces: `public.profiles`, `public.training_preferences`, `public.privacy_preferences`, and automatic one-row-per-Auth-user provisioning.

- [ ] **Step 1: Write the failing schema/provisioning test**

Create `supabase/tests/001_identity_schema.test.sql`:

```sql
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm run db:test -- supabase/tests/001_identity_schema.test.sql
```

Expected: FAIL because `public.profiles`, `public.training_preferences`, and `public.privacy_preferences` do not exist.

- [ ] **Step 3: Create the minimal identity migration**

Create `supabase/migrations/20260821000100_identity_core.sql`:

```sql
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
```

This migration enables and forces RLS before granting access. There is no interval in which a checked-in migration exposes the new tables publicly.

- [ ] **Step 4: Rebuild the local database from migrations**

Run:

```bash
npm run db:reset
```

Expected: the reset applies `20260821000100_identity_core.sql` without an error.

- [ ] **Step 5: Run the focused schema test**

Run:

```bash
npm run db:test -- supabase/tests/001_identity_schema.test.sql
```

Expected: PASS with ten assertions.

- [ ] **Step 6: Commit the deny-by-default schema**

Run:

```bash
git add supabase/migrations/20260821000100_identity_core.sql supabase/tests/001_identity_schema.test.sql
git commit -m "feat: add identity database foundation"
```

---

### Task 3: Owner-Only Identity RLS and Column Grants

**Files:**
- Create: `supabase/tests/002_identity_rls.test.sql`
- Create: `supabase/migrations/20260821000200_identity_rls.sql`

**Interfaces:**
- Consumes: The three deny-by-default identity tables from Task 2.
- Produces: owner-only reads and allowlisted updates for authenticated guests and permanent users.

- [ ] **Step 1: Write the failing authorization test**

Create `supabase/tests/002_identity_rls.test.sql`:

```sql
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm run db:test -- supabase/tests/002_identity_rls.test.sql
```

Expected: FAIL because `authenticated` has no select or update grants and no owner policies yet.

- [ ] **Step 3: Add minimal grants and owner policies**

Create `supabase/migrations/20260821000200_identity_rls.sql`:

```sql
grant select on public.profiles to authenticated;
grant update (locale) on public.profiles to authenticated;

grant select on public.training_preferences to authenticated;
grant update (
  preferred_duration_minutes,
  sound_enabled,
  cues_enabled,
  reminders_enabled
) on public.training_preferences to authenticated;

grant select on public.privacy_preferences to authenticated;
grant update (analytics_consent_status) on public.privacy_preferences to authenticated;

create policy profiles_select_own
on public.profiles
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy profiles_update_own
on public.profiles
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy training_preferences_select_own
on public.training_preferences
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy training_preferences_update_own
on public.training_preferences
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy privacy_preferences_select_own
on public.privacy_preferences
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy privacy_preferences_update_own
on public.privacy_preferences
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and analytics_consent_status in ('granted', 'denied')
);
```

No `anon` grant is added. Supabase anonymous users are authenticated users with their own UUID, so the same owner policies protect both identity states.

- [ ] **Step 4: Reset and rerun the focused test**

Run:

```bash
npm run db:reset
npm run db:test -- supabase/tests/002_identity_rls.test.sql
```

Expected: the reset succeeds and all thirteen authorization assertions pass.

- [ ] **Step 5: Run all database tests**

Run:

```bash
npm run db:test
```

Expected: environment, schema, and identity RLS files all pass.

- [ ] **Step 6: Commit identity authorization**

Run:

```bash
git add supabase/migrations/20260821000200_identity_rls.sql supabase/tests/002_identity_rls.test.sql
git commit -m "feat: enforce identity row ownership"
```

---

### Task 4: Active Movement Constraint Privacy Boundary

**Files:**
- Create: `supabase/tests/003_active_movement_constraints.test.sql`
- Create: `supabase/migrations/20260821000300_active_movement_constraints.sql`

**Interfaces:**
- Consumes: Auth-user provisioning and owner-policy pattern from Tasks 2 and 3.
- Produces: `public.active_movement_constraints` with closed `body_area`, `reason`, and `source` values; later workout generation reads these rows as safety inputs.

- [ ] **Step 1: Write the failing safety-data test**

Create `supabase/tests/003_active_movement_constraints.test.sql`:

```sql
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
npm run db:test -- supabase/tests/003_active_movement_constraints.test.sql
```

Expected: FAIL because `public.active_movement_constraints` does not exist.

- [ ] **Step 3: Create the closed-vocabulary constraint table**

Create `supabase/migrations/20260821000300_active_movement_constraints.sql`:

```sql
create table public.active_movement_constraints (
  user_id uuid not null references auth.users(id) on delete cascade,
  body_area text not null
    check (body_area in (
      'lower_back',
      'neck',
      'shoulders',
      'hips',
      'knees',
      'other'
    )),
  reason text not null
    check (reason in ('pain_or_discomfort', 'ongoing_limitation')),
  source text not null
    check (source in ('onboarding', 'settings')),
  created_at timestamptz not null default now(),
  primary key (user_id, body_area)
);

alter table public.active_movement_constraints enable row level security;
alter table public.active_movement_constraints force row level security;

revoke all on public.active_movement_constraints from public, anon, authenticated;

grant select on public.active_movement_constraints to authenticated;
grant insert (user_id, body_area, reason, source)
on public.active_movement_constraints to authenticated;
grant delete on public.active_movement_constraints to authenticated;

create policy active_movement_constraints_select_own
on public.active_movement_constraints
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy active_movement_constraints_insert_own
on public.active_movement_constraints
for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy active_movement_constraints_delete_own
on public.active_movement_constraints
for delete
to authenticated
using ((select auth.uid()) = user_id);
```

The table stores an active safety constraint, not a historical pain event. Removing a row clears that active constraint. Workout pain handling later excludes the known exercise without inserting a body-area history row.

- [ ] **Step 4: Reset and run the focused test**

Run:

```bash
npm run db:reset
npm run db:test -- supabase/tests/003_active_movement_constraints.test.sql
```

Expected: the reset succeeds and all nine assertions pass.

- [ ] **Step 5: Run all database tests and lint**

Run:

```bash
npm run db:test
npm run db:lint
```

Expected: four pgTAP files pass and database lint reports no warning-level security defect in the new schema.

- [ ] **Step 6: Commit the active constraint boundary**

Run:

```bash
git add supabase/migrations/20260821000300_active_movement_constraints.sql supabase/tests/003_active_movement_constraints.test.sql
git commit -m "feat: protect active movement constraints"
```

---

### Task 5: Generate the Typed Database Contract and Verify the Slice

**Files:**
- Create: `src/database/database.types.ts` using the Supabase generator

**Interfaces:**
- Consumes: The fully reset and tested local schema from Tasks 1–4.
- Produces: generated `Database` types for later identity and repository plans; no runtime Supabase client is introduced.

- [ ] **Step 1: Generate TypeScript types from the tested local schema**

Run:

```bash
npx supabase gen types typescript --local > src/database/database.types.ts
```

Expected: the generated file exports `Database` and contains `profiles`, `training_preferences`, `privacy_preferences`, and `active_movement_constraints` under the public schema.

- [ ] **Step 2: Confirm the generated contract contains no email field in profiles**

Run:

```bash
rg -n "profiles|training_preferences|privacy_preferences|active_movement_constraints" src/database/database.types.ts
rg -n "email" src/database/database.types.ts
```

Expected: all four tables are present. `email` does not appear as a `profiles` field; any Auth-internal schema is not part of the generated public client contract.

- [ ] **Step 3: Run the complete database verification from a clean reset**

Run each command separately:

```bash
npm run db:reset
npm run db:test
npm run db:lint
```

Expected: migrations rebuild from zero, all four pgTAP files pass, and lint has no warning-level defect.

- [ ] **Step 4: Run the existing application verification**

Run each command separately:

```bash
npm test
npm run typecheck
npx expo-doctor
```

Expected: all existing Jest suites pass, TypeScript exits successfully, and Expo Doctor reports all checks passed. `npm run lint` is not run because the repository currently has no lint script; adding an application linter is outside this plan.

- [ ] **Step 5: Review the staged boundary before committing**

Run:

```bash
git status --short
git diff --check
git diff -- src/database/database.types.ts
```

Expected: only the generated type file is uncommitted in this task. `.superpowers/` and the pre-existing untracked feedback-reducer plan remain untracked and unstaged.

- [ ] **Step 6: Commit the typed schema contract**

Run:

```bash
git add src/database/database.types.ts
git commit -m "chore: generate identity database types"
```

---

## Completion Evidence

This plan is complete only when all of the following are true:

- The local Supabase stack starts from committed configuration without remote credentials.
- `npm run db:reset` rebuilds the identity schema from zero.
- All pgTAP tests pass for schema shape, provisioning, grants, RLS isolation, and constraint vocabulary.
- An unauthenticated request has no user-table grants.
- Guest A cannot read or modify permanent user B.
- The client cannot insert/delete profiles or update non-allowlisted identity columns.
- Analytics remains `pending` until an explicit user choice.
- No email or free-form health field exists in the public identity schema.
- Generated TypeScript types match the tested schema.
- The existing Jest suite, strict TypeScript check, and Expo Doctor remain green.
- The implementation is split into the four commits named above, with no push unless the user explicitly requests it.

## Follow-on Plans

After this plan is reviewed and implemented, write separate plans in this order:

1. SecureStore-backed Supabase client, `IdentityService`, and anonymous identity bootstrap.
2. Server-authoritative workout generation and completion commands plus workout RLS.
3. SQLCipher active-workout persistence and idempotent offline completion queue.
4. Email OTP linking and secure guest-to-existing-account merge.
5. Privacy Center, data export, deletion saga, and store-policy evidence.

Apple and Google provider adapters follow the V1 email OTP release and reuse the approved provider-neutral identity boundary.
