# Adaptive Core — Pattern Target Selection Design

**Status:** Approved direction, awaiting written-spec review

**Date:** 2026-08-14

**Scope:** Select the movement-pattern targets for an equipment-free 5, 10, or 15-minute workout

## 1. Purpose

The eligibility filter answers which catalog entries are safe and release-ready. Pattern target selection answers the next, narrower question: which movement patterns should the next workout represent?

This module does not choose a specific exercise, prescribe load, order the workout, or fit exact work and rest intervals into the time budget. Those remain later generator stages.

## 2. Decisions

The MVP uses this duration-to-target policy:

| Selected duration | Target movement count | Target pattern count |
|---|---:|---:|
| 5 minutes | 3 | 3 |
| 10 minutes | 4 | 4 |
| 15 minutes | 6 | 6 |

Every selected target has a different primary movement pattern. A shorter workout therefore provides breadth without repeating one pattern at the expense of another.

The target is a ceiling, not a quota. If fewer safe patterns are represented by eligible entries, selection returns the available safe subset. It never restores an excluded, unsuitable, unreviewed, or non-bodyweight exercise to reach the target count.

## 3. Inputs and output

The pure engine function receives:

- entries already returned by `filterEligibleExercises`;
- the selected duration: `5 | 10 | 15`;
- recent exposure counts by movement pattern;
- the stored deterministic seed.

It returns a result containing:

- the selected unique movement patterns;
- the requested target count;
- whether the target had to be shortened;
- `DURATION_USER_SELECTION`;
- `VARIATION_PATTERN_BALANCE` when recent exposure affected the selection.

The result makes safe shortening explicit so later stages and the UI do not have to infer it from array length.

## 4. Selection rules

Selection applies these rules in order:

1. Build the unique set of primary patterns represented by eligible entries.
2. Read the target count from the `3 / 4 / 6` duration policy.
3. Prefer the pattern with the lowest recent exposure count.
4. Break equal exposure scores with a stable rank derived from `seed + pattern`.
5. If the derived ranks collide, use the canonical movement-pattern order as the final stable tie-breaker.
6. Take at most the duration target count.

Recent exposure counts are supplied by the caller. This module deliberately does not decide the history window or read persistence, keeping it pure and independently testable.

The seed is used only to break equal safe choices. It must never override eligibility or pattern-balance rules, and the implementation must not use `Math.random()`.

## 5. Data flow

```text
Catalog + user constraints + recovery state
                    ↓
          Eligibility filter
                    ↓
 Eligible catalog entries + duration + recent counts + seed
                    ↓
         Pattern target selection
                    ↓
 Unique pattern targets + reason codes + shortening state
                    ↓
       Specific exercise selection (later stage)
```

This is a **pipeline stage**: each stage has one responsibility and passes a typed result to the next stage.

## 6. Safety and empty states

- Zero eligible entries returns zero targets and `shortened: true`.
- Fewer eligible patterns than requested returns all safe patterns and `shortened: true`.
- Multiple eligible exercises with the same primary pattern create only one pattern target.
- Missing recent exposure data is treated as zero exposure for that pattern.
- The function does not relax safety, catalog review, equipment, level, exclusion, or recovery constraints.

Later workout generation will decide whether an empty result becomes explicit rest/recovery guidance. This selection module does not invent UI copy or medical guidance.

## 7. Determinism

The same eligible entries, duration, recent exposure counts, and seed must always produce the same targets, regardless of the original catalog array order.

Changing only the seed may change choices only among patterns with equal exposure counts. This ensures reproducible variety without making the core decision random.

## 8. Testing strategy

Tests are written before implementation and must prove:

1. 5, 10, and 15 minutes request 3, 4, and 6 unique patterns.
2. Only patterns represented by eligible entries can be selected.
3. Lower recent exposure wins before seeded variation.
4. The same inputs and seed produce the same result.
5. Reordering catalog input does not change the result.
6. Different seeds can vary equal-score choices.
7. Duplicate primary patterns do not create duplicate targets.
8. Too few safe patterns return a shortened result instead of weakening constraints.
9. An empty eligible list returns an explicit empty shortened result.

## 9. Files and boundaries

Implementation will add:

- `src/engine/select-pattern-targets.ts`
- `src/engine/select-pattern-targets.test.ts`

The duration target map may live in `src/engine/policy.ts` because it is a stable engine policy value. Shared result and explanation-code types may be added to `src/engine/types.ts`.

The module must not import React, Expo, Supabase, PostHog, localization, or database code.

## 10. Non-goals

- Selecting the final exercise for each pattern
- Calculating reps, seconds, sets, rest, setup, or transitions
- Ordering exercises inside the player
- Replacement behavior
- Exact time-budget fitting
- Recovery/rest UI content
- Defining how persistence converts workout history into exposure counts
