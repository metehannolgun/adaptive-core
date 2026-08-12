# MVP Definition — Implementation Reference

## User Stories

1. New user states time, experience, and movement limitations → appropriate first workout.
2. New user completes a short baseline without expert knowledge.
3. Returning user sees and starts today's workout within seconds.
4. User understands an exercise through a loop and concise cues.
5. User replaces an unsuitable exercise without abandoning the session.
6. User reports: easy, appropriate, hard, incomplete, or painful.
7. User sees that the next workout changed for a stated reason.
8. User who missed days receives an appropriate current workout.
9. User sees simple evidence of capacity and consistency progress.

## Included Capabilities

### Onboarding
- Guest-first anonymous identity (no account blocks first value)
- One-tap optional analytics choice on Welcome
- Three single-question steps: experience, duration, movement limitations
- Duration: 5, 10, or 15 minutes
- Bodyweight-only communicated as info, not a question

### Baseline Assessment
- ~2–3 minutes, ≤3 foundation movements
- Completion + perceived effort per movement
- Immediate stop path for pain/discomfort
- Initial capability state by pattern

### Today Screen
- Workout preview, duration, "why this workout" explanation
- One primary start action
- No automatic workout start

### Workout Player
- Current exercise, prescribed reps/duration, sets, rest
- One critical form cue in primary view
- On-demand detail: ≤3 form cues, breathing, common mistake, stop conditions
- Pause, resume, skip/replace, end-session controls
- Local persistence for interrupted workout resume

### Feedback
- Post-workout: easy | appropriate | hard | incomplete | pain
- Pain → body-area capture (predefined list, no free text)
- Exercise-level pain/incomplete overrides session outcome
- "What we learned" explanation with reason codes

### Progress
- Weekly consistency (no punitive streaks)
- Movement-pattern capability progress
- Recent adaptation explanations
- Session history

### Settings
- Sound, cue, reminder preferences
- Language: EN/TR, device locale default, manual override
- Account, privacy, deletion, subscription management

## Screen Map v1

### First-Use Flow
1. Welcome + analytics choice
2. Safety/scope notice (18+ confirmation)
3. Onboarding: experience
4. Onboarding: duration
5. Onboarding: limitations
6. Baseline intro
7. Baseline player
8. Today / "Your first workout is ready"

### Core Loop
1. Today
2. Workout preview
3. Workout player
4. Exercise detail/replacement panel
5. Session feedback
6. "What we learned"

### Navigation Tabs
- Today | Progress | Settings

### Commercial Validation
- Beta: non-transactional intent test after ≥2 completed workouts
- Paid MVP: onboarding + baseline + 2 adaptive workouts free, then membership

## Golden Path

```
Install → understand promise → guest → 3 constraints → baseline → preview → complete/modify → feedback → "what we learned" → save progress (create account) → return → adapted 2nd workout → complete → beta upgrade-intent test
```

## Required Edge Cases

- App closed during workout → resume
- Offline during active workout → cached workout continues
- Cannot perform exercise → replacement flow
- No eligible alternative → shorten workout
- Pain flagged → exclusion + stop guidance
- Early end → partial results saved
- Missed days → recalculate from current state
- Media fails → text cues fallback
- Time budget violated after substitution → refit
- Analytics/notification unavailable → product continues
- Account deletion requested → data removal

## Acceptance Conditions

- Guest completes onboarding → baseline → workout → adaptation without account
- Account linking preserves all temporary history
- All 5 feedback outcomes create specified state transitions
- Pain prevents reselection until exclusion cleared
- Every workout fits time budget within tolerance
- No excluded exercise appears in any workout
- Recent-history prevents accidental repetition
- Missed days never advance a fixed calendar
- Every load change has explanation code + user-facing copy
- Interrupted workout resumes without corruption
- Beta paywall: not before 2 workouts, cannot collect payment
- Every UI key exists in both EN and TR
- Analytics decline does not block any product function
