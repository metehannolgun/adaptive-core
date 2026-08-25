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
