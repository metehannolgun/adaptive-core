# Adaptive Core — Project Bible

**Version:** 1.0  
**Status:** Source of truth for MVP definition  
**Product stage:** Discovery complete; Definition in progress  
**Audience:** Founders, product, design, engineering, and future contributors

## 1. Purpose of this document set

Adaptive Core is a global, mobile-first fitness startup focused initially on short, equipment-free core training for busy beginners and early-intermediate users. This document set records the decisions already made during discovery so the team can move into product definition and implementation without restarting ideation.

This file is the entry point. The specialist documents contain the operational detail:

- [`01_MARKET_RESEARCH.md`](./01_MARKET_RESEARCH.md): market evidence, user pain points, and evidence limits.
- [`02_COMPETITOR_ANALYSIS.md`](./02_COMPETITOR_ANALYSIS.md): competitor categories, gaps, and positioning implications.
- [`03_PRODUCT_DECISIONS.md`](./03_PRODUCT_DECISIONS.md): accepted, rejected, and deferred product decisions.
- [`04_MVP_DEFINITION.md`](./04_MVP_DEFINITION.md): users, scope, flows, acceptance conditions, and success signals.
- [`05_TECHNICAL_ARCHITECTURE.md`](./05_TECHNICAL_ARCHITECTURE.md): agreed stack, boundaries, data flow, security, and delivery constraints.
- [`06_ALGORITHM_SPECIFICATION.md`](./06_ALGORITHM_SPECIFICATION.md): deterministic adaptation rules and safety boundaries.
- [`07_EXERCISE_DATABASE.md`](./07_EXERCISE_DATABASE.md): exercise taxonomy, schema, quality rules, and MVP seed library.
- [`08_ROADMAP.md`](./08_ROADMAP.md): phases, gates, sequencing, and launch path.
- [`09_UI_COPY_AND_SAFETY.md`](./09_UI_COPY_AND_SAFETY.md): approved English/Turkish UI copy, safety messages, terminology, and copy-quality gates.
- [`10_ANALYTICS_EVENT_CONTRACT.md`](./10_ANALYTICS_EVENT_CONTRACT.md): approved consent, identity, event, funnel, privacy, testing, and open-source-reference boundaries.

If two documents conflict, the most specific specialist document governs. A change to a settled direction must include the new evidence and update every affected document.

## 2. Product thesis

Existing core-training apps commonly offer fixed calendars, exercise libraries, or programs whose difficulty changes according to the day number. Adaptive Core instead generates the next workout after learning from the user’s latest performance.

> We do not sell workouts. We sell visible, sustainable progress.

The initial product is a core-training application. The enduring asset is the progression engine and structured exercise model that may later support push-up, pull-up, squat, mobility, and full-body modules. Those expansions are vision, not MVP scope.

## 3. Vision and mission

### Vision

Build the world’s best explainable adaptive workout-generation platform, beginning with core training.

### Mission

Help a busy beginner start a safe, appropriate five-to-fifteen-minute workout within seconds, complete it with clear guidance, and see the next workout adjust to what actually happened.

### Product promise

> No fixed plan. Every workout is built from your previous performance.

This promise must be true in the product, not merely marketing language.

## 4. Initial user

The MVP serves a deliberately narrow segment:

- aged 18 or older;
- beginner or early-intermediate;
- trains at home, initially without equipment;
- wants a stronger core and measurable improvement;
- has approximately 5, 10, or 15 minutes;
- does not know how to progress sets, repetitions, holds, or variations;
- has tried or considered simple workout apps;
- values clarity and convenience more than advanced athlete tooling.

The MVP is not designed for advanced athletes, rehabilitation, injury diagnosis, bodybuilding contest preparation, or medical treatment.

## 5. Core problem

The target user does not lack exercises. The user lacks an appropriate progression loop.

Common failure modes identified during discovery:

- a fixed 30-day schedule ignores actual performance;
- difficulty jumps according to a script rather than readiness;
- feedback does not change the next workout;
- routines become repetitive or overuse the same movement pattern;
- completing a program creates a “what now?” dead end;
- missed days break the calendar or create guilt;
- unclear form guidance reduces confidence;
- aggressive ads, paywalls, and changed purchase terms reduce trust;
- basic actions require too many screens or settings.

## 6. Solution model

The product operates as a closed loop:

```text
Onboarding and baseline
        ↓
Generate today’s workout
        ↓
Guide the workout
        ↓
Collect completion, effort, pain, and substitutions
        ↓
Update exercise and movement-pattern state
        ↓
Generate the next appropriate workout
```

The MVP engine is deterministic and rule-based. It does not require a paid AI API. Its decisions must be testable and explainable in plain language.

## 7. Differentiation

Adaptive Core is deliberately not:

- another static “abs in 30 days” challenge;
- a large video library with a thin recommendation layer;
- an AI chat interface presented as personalization;
- a social network, marketplace, or creator platform;
- a promise of spot fat reduction or a guaranteed six-pack.

The intended differentiators are:

1. **Performance-based adaptation:** completion and perceived effort affect the next exposure.
2. **Controlled variation:** variety is constrained by movement balance, fatigue, level, and recent history.
3. **Recovery-aware progression:** hard or incomplete work does not automatically produce more load.
4. **Real-life flexibility:** missed days and limited time recalculate the next workout instead of breaking a calendar.
5. **Explainable decisions:** the user can understand why a workout became harder, stayed stable, or became lighter.
6. **Visible progress:** improvements are expressed through capacity, consistency, and movement mastery—not unsupported body-composition promises.

## 8. Startup operating principles

### Lean and 0€-first

“0€ Startup” is an operating constraint for discovery, development, and pre-store validation. The founder is a student building the product solo, so available study time and personal finances are hard constraints rather than temporary inconveniences. Founder labor, open-source tools, properly licensed free assets, and free service tiers are used before any discretionary purchase. This is not a claim that third-party platform owners will waive unavoidable distribution fees.

- Validate demand and retention before meaningful spending.
- Build with founder time, open-source assets, and free service tiers where licensing permits.
- Plan work in sustainable increments around the founder’s education; no milestone justifies academic harm or unsustainable working hours.
- Do not purchase a service or content library before seriously evaluating free and open alternatives.
- Spend only when the expense produces measurable user value, reduces a demonstrated risk, or removes a launch blocker.
- Reserve professional exercise production as an investment after revenue or strong validation.

Any unavoidable Apple/Google developer-account fee belongs to the public-distribution gate, not the 0€ build phase. It is paid only with explicit founder approval after the product is ready for the relevant store; optional domain, advertising, design, content, and SaaS spending remains deferred. Launch may be sequenced by platform if paying both fees at once is not justified.

Minimum budget does not mean careless quality. It means narrowing scope and investing effort in the parts that prove the product thesis.

### Shipping discipline

- Use 60–90 days as a planning target, adjusted when the student founder’s academic workload requires it.
- Documentation must accelerate implementation.
- Prefer simple, testable behavior over premature sophistication.
- Research enough to manage user and business risk, then ship and learn.
- Product-market fit comes before scale.

### Feature filter

A feature is included only when it satisfies at least three of these conditions:

- solves a demonstrated user problem;
- can improve retention;
- supports a credible monetization path;
- is inexpensive enough to build and operate now;
- can be maintained by the student solo founder.

## 9. MVP summary

The MVP includes:

- onboarding and essential constraints;
- a simple baseline assessment;
- 5-, 10-, and 15-minute workout choices;
- a daily adaptive workout;
- workout player with concise form, breathing, and common-mistake cues;
- exercise replacement;
- post-workout feedback including pain/discomfort;
- recovery-aware next-workout generation;
- a simple progress screen;
- settings for sound, cues, language, and essential preferences;
- English and Turkish UI, safety, and exercise guidance.

The MVP excludes AI chat, camera-based form analysis, meal planning, social feeds, challenges, marketplaces, coach marketplaces, advanced wearable integrations, and professional video production.

## 10. Experience principles

- Today’s useful action is the primary screen.
- A returning user should be able to begin within seconds.
- User-facing anatomy remains simple; the engine uses movement patterns.
- Exercise guidance prioritizes confidence: short loop, three critical cues, breathing, and one common mistake.
- The system never punishes a missed day by blindly advancing a calendar.
- Feedback controls must be fast enough that users actually use them.
- Health language must be conservative: discomfort triggers exclusion and guidance to stop, not diagnosis.
- Copy is calm, supportive, concise, and available in English and Turkish; safety meaning must remain equivalent across both locales.

## 11. Business and trust principles

The exact price was not settled during discovery. The following principles were:

- the closed beta is free and validates the product loop before real payment is enabled;
- willingness to pay, package preference, and paywall intent are tested during beta without misleading users or charging them;
- paid public MVP is enabled only after product value, retention, safety, and purchase operations are credible;
- pricing and trial terms must be explicit;
- purchases must not be silently degraded or redefined;
- the basic value loop must be experienced before aggressive monetization;
- paid acquisition waits until retention indicates that users return;
- early growth prioritizes organic channels and shareable progress artifacts;
- unsupported transformation promises are prohibited.

## 12. Technical baseline

- React Native with Expo and TypeScript for one iOS/Android codebase.
- Supabase for authentication, PostgreSQL data, and storage.
- PostHog for product analytics.
- RevenueCat for cross-platform subscription management when monetization is enabled.
- Push notifications through the Expo/Firebase-compatible delivery path selected during implementation.
- No application-side generative-AI API in MVP.
- GIF, SVG, Lottie, or similarly lightweight licensed assets for exercise demonstrations.

Free-tier availability, pricing, platform policy, and package versions must be rechecked at implementation time; they are not permanent facts.

## 13. Success definition

The MVP succeeds when it provides evidence for the central thesis:

1. users can complete onboarding and start a first workout without assistance;
2. the generated workout changes coherently after easy, appropriate, hard, incomplete, and pain feedback;
3. users understand the reason for a meaningful adjustment;
4. users return for subsequent workouts;
5. users report that progression feels more appropriate than a fixed schedule;
6. the student founder can operate the product within sustainable time and near-zero-cost constraints;
7. beta evidence indicates that some target users are willing to pay for the adaptive value before paid public launch;
8. the first paid release can process, restore, and manage purchases without compromising trust.

Historical discussion mentioned example targets such as 1,000 active users, D30 retention above 25%, and 3–5% free-to-paid conversion. These are planning hypotheses, not validated forecasts or contractual launch gates.

## 14. Current phase and next action

Discovery is complete. The project is in Definition.

The immediate sequence is:

1. approve MVP screens and user flow;
2. lock the exercise schema and the initial licensed seed library;
3. convert the algorithm specification into executable test cases;
4. implement the vertical slice from onboarding to a second adapted workout;
5. run a small free closed beta and evaluate retention, willingness to pay, and packaging before enabling a paid public MVP;
6. enable real payment only after the product and commercial evidence gates pass.

## 15. Change-control rule

Future evidence may change a decision. It must not erase history. Any material change records:

- the previous decision;
- the new evidence;
- the replacement decision;
- affected product, algorithm, data, and roadmap sections;
- migration or user-trust implications.
