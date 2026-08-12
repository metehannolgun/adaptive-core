# Adaptive Core — Agent Instructions

## Project Overview

Adaptive Core is a mobile-first fitness app that generates short (5/10/15-minute), equipment-free core workouts. The next workout adapts based on the user's actual performance — not a fixed calendar. The engine is deterministic and rule-based (no AI API). MVP supports English and Turkish.

**Product thesis:** Users return when the next workout visibly and appropriately adapts to the previous one.

## Developer Context

The developer is a junior who is building their first React Native project. This changes how you work:

### Teaching Mode (Always On)

1. **Explain before you write.** Before producing code, briefly explain:
   - WHY this approach (not another)
   - WHAT pattern/concept this uses (e.g. "this is a custom hook", "this is the repository pattern")
   - HOW it connects to the rest of the system

2. **Comment the WHY, not the WHAT.** Bad: `// map over exercises`. Good: `// We filter by pattern first so the generator only considers exercises matching the target movement — this prevents cross-pattern contamination`.

3. **Name concepts when you introduce them.** When you use a pattern for the first time, name it and give a one-sentence explanation. Examples:
   - "This is **dependency injection** — we pass the data source as a parameter so we can swap it for a fake in tests."
   - "This is a **discriminated union** — TypeScript can narrow the type based on the `kind` field."
   - "This is **colocation** — we keep the component, its styles, and its types in the same folder so related code stays together."

4. **Propose → Explain → Wait for approval → Implement.** For any non-trivial change:
   - First, describe what you plan to do and why
   - Wait for the developer's approval
   - Then implement
   - Exception: If the developer explicitly says "yap" or "direkt ekle", proceed without waiting

5. **Use Turkish for explanations when the prompt is in Turkish.** Code and comments stay in English, but your explanations and reasoning should match the developer's language.

6. **Progressive complexity.** Start with the simplest version. When the developer is comfortable, mention what could be improved and why. Never dump advanced patterns without context.

7. **When the developer asks "why"**, give a real answer — not "it's best practice". Explain the concrete problem it solves in THIS project.

### Speed Controls (Token Optimization)
- If the developer says **"biliyorum"** or **"skip açıklama"**, skip the explanation and just write the code for that task.
- If the developer says **"kısa"** or **"özet"**, give a 1-2 sentence summary instead of a full explanation.
- Don't re-explain a pattern you already explained in this session. First time: full explanation. After that: just reference it ("here we use the same custom hook pattern from earlier").
- Keep explanations **concise** — 3-5 sentences max per concept. If the developer wants more detail, they'll ask.

### What NOT to do
- Don't write 500 lines and say "here's the implementation". Break it into digestible pieces.
- Don't assume the developer knows React patterns, TypeScript generics, or mobile-specific concepts.
- Don't skip error handling and say "you can add this later". Teach it as you go.
- Don't use complex one-liners to look clever. Readable > compact.

## Tech Stack

- **Mobile:** React Native + Expo + TypeScript (strict mode)
- **Backend:** Supabase (Auth, PostgreSQL, Storage)
- **Analytics:** PostHog (optional, consent-first, 11 events only)
- **Purchases:** RevenueCat (deferred until monetization)
- **Exercise media:** Licensed GIF/SVG/Lottie assets
- **Adaptation engine:** Pure TypeScript — no external rule-engine dependency

## Setup Commands

```bash
npm install
npx expo start
```

## Test Commands

```bash
# Unit tests (engine, analytics contract, i18n)
npm test

# Type checking
npx tsc --noEmit

# Lint
npm run lint
```

Always run tests before completing a task. All engine tests must pass.

## Project Structure

```
adaptive-core/
├── AGENTS.md              ← You are here
├── docs/                  ← Detailed specs (read when referenced)
│   ├── 04_MVP_DEFINITION.md         ★ Screen map, acceptance conditions
│   ├── 05_TECHNICAL_ARCHITECTURE.md ★ Data model, boundaries
│   ├── 06_ALGORITHM_SPECIFICATION.md★ Engine logic, feedback reducer
│   ├── 07_EXERCISE_DATABASE.md      ★ Schema, seed exercises
│   ├── 09_UI_COPY_AND_SAFETY.md     ★ All UI text (EN/TR)
│   ├── 10_ANALYTICS_EVENT_CONTRACT.md★ Event definitions
│   └── (01-03, 08 = human-only reference)
├── src/
│   ├── engine/            ← Pure TS adaptation engine
│   ├── types/             ← Shared TypeScript types
│   ├── i18n/              ← Translations and locale logic
│   ├── analytics/         ← Typed analytics service
│   └── database/          ← Supabase schema and queries
└── package.json
```

## Critical Constraints

1. **0€ budget** — No paid APIs, no paid services beyond free tiers. Founder labor and open-source only.
2. **Deterministic engine** — Same inputs + same seed = same workout. Every adaptation has an explanation code.
3. **Bilingual** — Every user-facing string must exist in both `en` and `tr`. Safety/exercise content missing in either locale blocks release.
4. **Safety-first** — Pain is never effort. Pain excludes the exercise. The app does not diagnose or treat.
5. **No autocapture** — Analytics uses exactly 11 explicit events. No automatic screen tracking, session replay, or GeoIP.
6. **Guest-first** — First value (onboarding → baseline → first workout → adaptation) happens without account creation.

## Engineering Principles

- Choose the simplest implementation that fully meets current requirements. Avoid speculative abstractions, configuration, and indirection.
- Grow the system in layers. Start from the smallest version that works end to end, and add each new capability on top of a product that already works.
- Keep components modular and concerns clearly separated.
- Prefer established, well-maintained libraries when they reduce overall complexity or improve reliability. Do not reimplement common functionality without a clear reason.
- Lean on the dependencies already in the project before writing your own implementation or adding packages.
- Make architectural decisions for the long term. Do not accept a stopgap that only works for now and is meant to be replaced later.
- Never trade a working product for unfinished complexity.
- Do not preserve backward compatibility for code that doesn't exist yet.

## Coding Conventions

- TypeScript strict mode, no `any` unless explicitly justified
- Prefer `type` over `interface` for data shapes
- Engine code is pure functions with no side effects — no React imports, no Supabase imports
- Use stable enum string unions (e.g., `"easy" | "appropriate" | "hard"`) not numeric enums
- File naming: `kebab-case.ts` for modules, `PascalCase.tsx` for React components
- No hard-coded user-facing strings — use i18n keys from `docs/09_UI_COPY_AND_SAFETY.md`
- Every exercise relation, progression edge, and safety mapping needs a `reason` field

## How to Use Reference Docs

When working on a specific area, read the relevant doc first:

- **Engine/algorithm work** → Read `docs/06_ALGORITHM_SPECIFICATION.md` and `src/engine/AGENTS.md`
- **UI text or safety copy** → Read `docs/09_UI_COPY_AND_SAFETY.md` and `src/i18n/AGENTS.md`
- **Analytics events** → Read `docs/10_ANALYTICS_EVENT_CONTRACT.md` and `src/analytics/AGENTS.md`
- **Database schema** → Read `docs/05_TECHNICAL_ARCHITECTURE.md` (section 5)
- **Exercise data** → Read `docs/07_EXERCISE_DATABASE.md`
- **Screen map and flows** → Read `docs/04_MVP_DEFINITION.md`

Do NOT load all docs at once. Read only what the current task requires.

## Key Decisions (Do Not Revisit)

- No AI chat coach, camera form analysis, meal planning, or social features in MVP
- No fixed 30-day calendar — progression is performance-based
- Paywall after 2 completed adaptive workouts (not before)
- 5 feedback outcomes: easy, appropriate, hard, incomplete, pain
- 6 movement patterns: trunk_flexion, anti_extension, anti_rotation, rotation, lateral_stability, hip_control
- Pain stops/excludes — it never progresses
- Two consecutive easy results required before progression
- MVP seed library: ~30 bodyweight core exercises (candidate set, requires review)
