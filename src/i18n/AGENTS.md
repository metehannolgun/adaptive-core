# i18n — Agent Instructions

This directory handles localization for English (`en`) and Turkish (`tr`).

For the full approved copy, read `docs/09_UI_COPY_AND_SAFETY.md`.

## Locale Resolution

1. Check persisted manual preference
2. If absent: device locale `tr` → Turkish; everything else → English
3. Manual choice on Welcome or Settings overrides device locale
4. Persists for both signed-out and signed-in use

## Rules

- Every user-facing string uses a stable translation key — never hard-code text
- Both `en` and `tr` must have identical keys (no orphans, no duplicates)
- Safety/exercise content missing in either locale **blocks release**
- General UI copy may fall back to English at runtime (log the fallback)
- Do NOT build sentences by concatenating fragments — use complete sentences with tokens
- Prices, durations, and counts use locale-aware formatting

## Runtime Tokens

These are deliberate placeholders, not unfinished copy:

```
{exercise_name}, {localized_price}, {billing_period},
{duration_minutes}, {movement_count},
{movement_index}, {movement_total},
{set_index}, {set_total}, {reps_per_side},
{completed_count}
```

## Voice Rules

- Calm, supportive, concise, trustworthy
- No shame, guilt, or "no excuses" language
- No "push through pain"
- No medical claims, diagnosis, or rehabilitation language
- No guaranteed transformation or spot-fat-reduction claims
- No fake precision or invented percentages

## Key Navigation Terms

| Key | English | Turkish |
|---|---|---|
| nav.today | Today | Bugün |
| nav.progress | Progress | İlerleme |
| nav.settings | Settings | Ayarlar |
