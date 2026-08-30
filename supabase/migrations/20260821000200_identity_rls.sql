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
