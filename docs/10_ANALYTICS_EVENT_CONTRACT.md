# Analytics Event Contract — Implementation Reference

## Collection Boundary

- Analytics starts **disabled** by default
- Welcome flow: one-tap choice (Share / Continue without sharing)
- Choice stored on device, changeable in Settings
- Declining is NOT sent as an event
- Disabled: autocapture, auto screen tracking, session replay, auto lifecycle events, auto exception capture, auto GeoIP
- Only events and properties in this document may be sent
- Analytics failure must not block any product function

## Identity Lifecycle

1. Supabase creates temp anonymous identity from first use
2. PostHog keeps its own anonymous identity while guest
3. Supabase UUID is NOT added as custom event property
4. After successful permanent account linking → PostHog identifies with stable Supabase UUID → emit `account_created`
5. No PostHog identification until account linking + data preservation succeed
6. Existing account sign-in: merge anonymous records before changing analytics identity
7. Logout and deletion reset PostHog identity
8. NEVER add: email, name, phone, OAuth data, advertising IDs, hardware IDs

## Technical Boundary

```
Product action persisted → AnalyticsService → ConsentStore check → EventMap check → PropertyAllowlist check → PostHogAdapter → PostHog
```

Four units: `AnalyticsEventMap`, `AnalyticsService`, `ConsentStore`, `PostHogAdapter`

## Common Properties (every event)

| Property | Type |
|---|---|
| `locale` | `"en" \| "tr"` |
| `platform` | `"ios" \| "android"` |
| `app_version` | string |
| `user_state` | `"guest" \| "account"` |
| `analytics_schema_version` | `1` |

## Event Map (exactly 11 events)

| Event | Trigger | Properties |
|---|---|---|
| `onboarding_started` | First onboarding question active after consent choice | — |
| `onboarding_completed` | All 3 answers saved | — |
| `baseline_completed` | Baseline persisted as completed | — |
| `workout_started` | Workout first enters active state (not on resume) | `workout_number: 1 \| 2 \| 3_plus` |
| `workout_completed` | Workout first persisted as completed | `workout_number: 1 \| 2 \| 3_plus` |
| `feedback_submitted` | Post-workout outcome persisted | `difficulty: too_easy \| just_right \| too_hard \| incomplete` |
| `adaptation_viewed` | User first sees "What we learned" | `adaptation_direction: progress \| maintain \| reduce \| recover` |
| `account_created` | Guest → permanent identity linked | — |
| `paywall_viewed` | Beta offer visible after ≥2 workouts | — |
| `upgrade_intent_selected` | User picks intent or dismisses | `intent: would_choose \| notify_me \| dismissed` |
| `pain_flagged` | Pain persisted, protective flow starts | `context: baseline \| workout \| feedback` |

Note: `pain` is NOT a `difficulty` value. Pain emits `pain_flagged` and follows safety path.

## Forbidden Data (NEVER send)

- Email, name, phone, date of birth, exact age
- Free text or rendered UI copy
- Movement limitation or health-condition details
- Pain body area, symptoms, severity, medical history
- Exercise notes, individual reps, hold durations, workout content
- Exact price as user text
- Tokens, sessions, provider payloads, database records
- Raw error messages containing user data

## Decision Funnels

### Activation
```
onboarding_started → onboarding_completed → baseline_completed → workout_started(1) → workout_completed(1) → feedback_submitted → adaptation_viewed
```

### Second-Workout Return
```
workout_completed(1) → workout_started(2) → workout_completed(2)
```

### Commercial Intent
```
adaptation_viewed → account_created → workout_completed(2) → paywall_viewed → upgrade_intent_selected
```

### Safety Ratio
```
pain_flagged / workout_started
```

## Reliability Rules

- Persist product action BEFORE requesting analytics capture
- Do NOT emit from component render or screen-view hooks
- Lock/debounce after first accepted submission
- Emit only on first state change
- Resumed workout does NOT emit another `workout_started`
- Adapter exceptions caught silently at analytics boundary
- Dev/test environments use no-op or in-memory adapter

## Required Tests

### Contract
- Every event accepts only declared properties
- Unknown event/property fails TypeScript validation
- Payload scan rejects forbidden keys and free text
- EN/TR flows use identical event names and enum values

### Consent & Identity
- No event before choice or after decline
- Settings preference change stops/resumes capture
- Successful linking → identify once → `account_created`
- Failed linking never changes analytics identity
- Logout/deletion reset identity cleanly

### Flow
- Golden paths produce approved ordered events
- Double tap = one completion event
- Resume = no duplicate start
- Offline event queued and delivered later
- Analytics unavailable ≠ product blocked
- Beta paywall: no purchase event, not before 2 workouts
