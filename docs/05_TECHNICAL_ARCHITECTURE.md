# Technical Architecture — Implementation Reference

## Stack

| Concern | Decision |
|---|---|
| Mobile | React Native + Expo + TypeScript |
| Backend | Supabase (Auth, PostgreSQL, Storage) |
| Analytics | PostHog (optional, consent-first) |
| Purchases | RevenueCat (when monetization launches) |
| Notifications | Expo/Firebase-compatible push path |
| Exercise media | Licensed GIF/SVG/Lottie assets |
| Adaptation | Pure TypeScript rules engine |

## Logical Components

```
Mobile application
├── Presentation and navigation
├── Onboarding and settings
├── Workout player + local active-session store
├── Progress views
├── Locale resolver + bundled UI-copy catalog
├── Typed analytics service, consent store, PostHog adapter
└── Domain package (pure TS, no UI deps)
    ├── exercise eligibility
    ├── workout generation
    ├── feedback reducer
    ├── explanation codes
    └── safety constraints

Supabase
├── authentication
├── profiles + preferences
├── exercise catalog + localized content + media metadata
├── workout prescriptions + items
├── workout sessions + results
├── capability state + exclusions
├── adaptation events
├── entitlement snapshot
```

## Domain Boundaries

| Domain | Owns |
|---|---|
| Catalog | Exercise definitions, patterns, progression/regression links, safety tags, EN/TR content, media, versioning |
| Prescription | Immutable generated workout: exercises, load, order, rest, time estimate, engine version, explanation codes |
| Performance | What user actually did: replacements, effort, completion, discomfort, timestamps |
| Adaptation State | Capability estimates, recent exposure, fatigue/recovery, exclusions, next eligible load range |
| Identity | Account, privacy prefs, analytics consent, access rights |

## Data Model

| Table | Responsibility |
|---|---|
| `profiles` | User experience, locale (`en`/`tr`), created/deleted state |
| `training_preferences` | Duration, equipment, cues, reminders |
| `exercises` | Versioned canonical exercise metadata |
| `exercise_content` | Versioned localized name, cues, breathing, mistakes, stop conditions, alt text (keyed by exercise + locale) |
| `exercise_relations` | Progression, regression, substitute edges |
| `exercise_media` | Asset URL, type, license, attribution, checksum, status |
| `workout_prescriptions` | Immutable generated workout header + engine version |
| `workout_items` | Ordered prescribed sets/reps/seconds/rest + exercise snapshot |
| `workout_sessions` | Start/end/status + session-level effort |
| `workout_results` | Performed result per item, replacement, discomfort flag |
| `capability_state` | Current state per user + movement pattern/exercise |
| `exercise_exclusions` | Temporary/persistent exclusions + source |
| `adaptation_events` | Before/after state, reason code, engine version |
| `entitlements` | Normalized access state + provider reference |

Prescriptions and results retain snapshots so later catalog edits don't rewrite history.

## Localization Lifecycle

1. Resolve locale: persisted manual pref → device Turkish → English default
2. Load bundled UI copy through stable keys
3. Load exercise content matching locale + prescription content version
4. Missing general UI copy → fall back to English + log error
5. Missing safety/exercise content → fail closed (don't show unreviewed text)
6. Locale change updates copy without changing workout/timer/prescription state

## Generation Lifecycle

1. Client requests workout with duration + current date
2. System gets constraints, capability state, exclusions, recent history, catalog version
3. Pure generator produces candidate workout + explanation codes
4. Validation: time budget, eligibility, pattern balance, duplicates, safety
5. Prescription saved immutably with generator/catalog versions
6. Client caches prescription
7. Results queued locally, synced idempotently
8. Feedback reducer produces adaptation events + updated state
9. Next generation reads new state (no fixed day counter)

## Offline Strategy

- Cache current prescription + exercise content + media metadata
- Persist timer/player state and results locally
- Queue completion with client-generated idempotency key
- Retry sync without duplicating sessions
- No offline generation of new authoritative workouts
- No cached prescription → explain connection needed

## Security Rules

- Supabase RLS for all user-owned records
- No service-role credentials in client
- Analytics starts disabled, requires explicit consent
- Disable autocapture, session replay, auto screen/lifecycle events, auto GeoIP
- Account deletion with documented retention behavior
- Never send pain data to generative-AI provider
