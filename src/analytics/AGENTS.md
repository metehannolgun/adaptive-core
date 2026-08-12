# Analytics — Agent Instructions

This directory implements the typed analytics service. Screens and domain code call `AnalyticsService` only — never PostHog directly.

For the full contract, read `docs/10_ANALYTICS_EVENT_CONTRACT.md`.

## Architecture

```
Product action completed
        ↓
AnalyticsService.capture()
├── Is consent granted? (ConsentStore)
├── Is event in AnalyticsEventMap?
└── Do properties match allowlist?
        ↓
PostHogAdapter.capture()
```

## Four Units

1. **AnalyticsEventMap** — TypeScript map of every allowed event → exact property type
2. **AnalyticsService** — Only interface product code uses (capture, identify, reset)
3. **ConsentStore** — Device-level granted/declined state
4. **PostHogAdapter** — SDK init, opt-in/out, capture, identity, reset, dev no-op

## Version 1 Events (exactly 11)

| Event | Trigger |
|---|---|
| `onboarding_started` | First onboarding question active after consent choice |
| `onboarding_completed` | All 3 answers saved |
| `baseline_completed` | Baseline persisted as completed |
| `workout_started` | Workout enters active state (not on resume) |
| `workout_completed` | Workout persisted as completed |
| `feedback_submitted` | Post-workout outcome persisted |
| `adaptation_viewed` | User first sees "What we learned" |
| `account_created` | Guest → permanent identity linked |
| `paywall_viewed` | Beta offer visible (after 2+ workouts) |
| `upgrade_intent_selected` | User picks intent or dismisses |
| `pain_flagged` | Pain persisted, protective flow starts |

## Common Properties (every event)

```typescript
type CommonProperties = {
  locale: "en" | "tr";
  platform: "ios" | "android";
  app_version: string;
  user_state: "guest" | "account";
  analytics_schema_version: 1;
};
```

## Forbidden Data — NEVER send these

- Email, name, phone, date of birth
- Free text or rendered UI copy
- Movement limitations or health details
- Pain body area or symptoms
- Exercise details, reps, hold durations
- Tokens, session data, database records
- Raw error messages with user data

## Rules

- Analytics starts **disabled** by default
- Declining analytics is NOT sent as an event
- Capture AFTER the product action is persisted, not in render effects
- A resumed workout does NOT emit another `workout_started`
- Use in-memory adapter for tests, no-op for dev
- Adapter exceptions are caught silently — never surface as product errors
