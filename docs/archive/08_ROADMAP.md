# Adaptive Core — Roadmap

## 1. Roadmap principles

- Use 60–90 days as a sequencing target, flexible around the student solo founder’s academic workload and sustainable capacity.
- Keep discovery, development, and pre-store validation at 0€ through founder labor, free tiers, and licensed free assets.
- Validate willingness to pay during a free closed beta, then enable real payment only after product and commercial evidence gates pass.
- Ship the smallest complete adaptive loop, not a broad incomplete platform.
- A phase ends at an evidence gate, not because documents exist.
- Safety, licensing, and trust cannot be traded for speed.
- Paid growth follows retention evidence.
- Future modules do not shape MVP architecture beyond clean domain boundaries.

## 2. Current status

```text
Discovery                 Complete
Definition                In progress
MVP screen map v1         Approved
UI copy and safety v1     Approved
Analytics contract v1     Approved
Visual/technical design   Next
Implementation            Pending
Closed beta               Pending
Public launch             Pending
```

## 3. Phase 0 — Discovery (complete)

Outputs already accepted:

- global long-term vision and narrow initial user;
- qualitative market and competitor themes;
- progress-centered positioning;
- deterministic adaptive engine direction;
- near-zero-cost and Lean Startup rules;
- cross-platform technical stack;
- lightweight exercise-media strategy;
- initial MVP inclusions and exclusions.

Discovery reopens only if new evidence materially challenges these decisions.

## 4. Phase 1 — Definition (week 1)

### Deliverables

- approve this documentation set;
- approve the Version 1 screen map and low-fidelity golden-path wireframes;
- finalize user-facing vocabulary and safety copy;
- define exact onboarding inputs;
- define analytics event contract;
- convert algorithm outcomes into acceptance examples.

### Approved outputs

- guest-first entry without account friction;
- three single-question onboarding steps;
- English and Turkish MVP with device-locale default and manual language override;
- adult-only 18+ scope and layered safety messaging;
- guided 2–3-minute baseline with no more than three reviewed foundation movements;
- Today preview before workout start;
- focused single-exercise player with progressively disclosed guidance;
- low-friction session feedback and plain-language “What we learned” explanation;
- value-before-account transition after the first adaptation explanation;
- three-tab Today, Progress, and Settings navigation;
- free-beta upgrade-intent test after at least two completed workouts;
- explicit recovery, offline, pain, media-failure, resume, and no-substitute states;
- two free adaptive workouts followed by a transparent ongoing-membership boundary.
- optional one-tap analytics consent, eleven decision-focused events, three funnels, and a safety-path ratio without direct personal or health-detail properties;
- selective use of official Supabase, PostHog, and Expo examples without adopting a full boilerplate or external rule engine.

### Gate

A designer/developer can describe the bilingual guest-first-to-second-workout flow without unresolved product choices, and every screen supports that flow. Approved copy is recorded in `09_UI_COPY_AND_SAFETY.md`, and the approved analytics boundary is recorded in `10_ANALYTICS_EVENT_CONTRACT.md`. Algorithm fixtures must be completed before Definition closes.

## 5. Phase 2 — Engine and content foundation (weeks 2–3)

### Deliverables

- implement the pure TypeScript feedback reducer and generator;
- add invariant and scenario tests;
- create database migrations and row-level-security policies;
- create versioned English/Turkish exercise-content records and release checks;
- assemble and license-check the candidate exercise seed set;
- obtain qualified review of exercise metadata and progression chains;
- prototype duration estimation and replacement behavior.

### Gate

Given fixed inputs, the engine reproducibly generates a safe, time-bounded prescription; all mandatory algorithm scenarios pass; active exercises have reviewed metadata and verified licenses.

## 6. Phase 3 — Vertical-slice application (weeks 3–6)

### Deliverables

- Expo application shell and navigation;
- temporary/anonymous identity and value-before-account upgrade path;
- three-step onboarding and guided baseline;
- English/Turkish locale resolution, manual override, and bundled UI-copy catalog;
- Today screen and workout preview;
- focused workout player with interruption recovery and on-demand detailed guidance;
- feedback, pain, and replacement flows;
- synchronized immutable prescription/result history;
- adapted second workout and explanation;
- basic progress view;
- three-tab Today, Progress, and Settings navigation;
- typed consent-first analytics service and the eleven Version 1 events;
- Maestro golden-path tests after the device-runnable vertical slice exists.

### Gate

A test user can complete the golden path on both iOS and Android, including an offline interruption during an already-downloaded workout.

## 7. Phase 4 — Product hardening (weeks 6–8)

### Deliverables

- accessibility and device-size pass;
- generation failure and no-safe-substitute states;
- account deletion and privacy controls;
- notification preferences and conservative reminders;
- crash/error monitoring;
- content and copy quality review;
- bilingual truncation, accessibility, comprehension, fallback, and locale-switching tests;
- qualified review of English and Turkish exercise/safety content;
- store disclosures, privacy policy, and required legal review;
- optional monetization integration only if packaging is approved.

### Gate

No open launch-blocking safety, licensing, data-loss, entitlement, or critical-flow defects.

## 8. Phase 5 — Free closed beta and commercial validation (target weeks 8–10)

### Recruitment

Recruit a small group from relevant communities and the founder’s network. Do not buy scale or charge this cohort.

### Questions to answer

- Do users understand why this differs from a fixed plan?
- Does feedback feel fast and meaningful?
- Does the second workout feel appropriately changed?
- Which exercises are replaced or misunderstood?
- Do users return after one day, one week, and a missed period?
- Are pain and stop messages understood?
- What creates support burden or distrust?
- Which package and price presentation creates credible upgrade intent?
- Does observed paywall intent support what users say they would pay?
- Can the student founder support the cohort within sustainable time and cost limits?
- Which screens or decisions confuse users, create avoidable exits, or delay workout start?

### Gate

The core loop is comprehensible and stable, critical safety issues are resolved, retention is sufficient to justify a public test, and transparent non-transactional paywall tests show meaningful commercial intent. Numerical thresholds and the initial package are set after observing the first cohort rather than invented in advance.

Screen-map changes during testing follow an evidence loop: observe behavior, identify the problem, apply the smallest change, retest the same flow, and record material decisions. The approved map is a Version 1 hypothesis, not an excuse for uncontrolled scope growth.

## 9. Phase 6 — Paid public MVP launch (target weeks 10–13)

Public distribution is the first phase that may require unavoidable third-party account fees. Those fees are outside the 0€ build/beta budget, require explicit founder approval, and are paid only when the corresponding store package is ready. iOS and Android releases may be sequenced rather than forcing both costs on the same day.

### Deliverables

- App Store and Google Play listings;
- accurate screenshots and adaptation explanation;
- organic launch content;
- support and incident process;
- analytics dashboard for activation, adaptation, retention, and trust;
- approved package and pricing based on beta evidence;
- purchase, restoration, cancellation, and entitlement management;
- weekly product review cadence.

### Gate

Store approval, production monitoring, support readiness, trustworthy purchase operations, and a verified rollback/disable path for unsafe catalog or policy versions.

## 10. Post-launch learning order

1. Fix safety, crashes, lost workouts, and broken entitlements.
2. Improve first-workout activation.
3. Improve adaptation appropriateness and explanations.
4. Improve second-workout and weekly return.
5. Improve paid conversion, packaging, and pricing transparently without weakening trust.
6. Improve exercise guidance and licensed content based on actual usage.
7. Test organic sharing and acquisition loops.
8. Consider paid acquisition only after retention and unit-cost signals are credible.

## 11. Deferred roadmap candidates

Candidates enter only through evidence and the decision filter:

- HealthKit/Health Connect and wearables;
- richer readiness and reassessment;
- progress heatmaps, personal-record sharing, missions, XP, or unlocks;
- proprietary professional exercise video;
- natural-language coaching;
- additional languages;
- equipment support;
- new training domains: push-up, pull-up, squat, mobility, full body.

No date is assigned to these items because that would imply commitment without validation.

## 12. Weekly operating cadence

- Review activation, feedback outcomes, replacements, pain flags, retention, commercial-intent signals, operating cost, and founder support time.
- Choose one highest-risk product assumption or failure mode.
- Make the smallest testable improvement.
- Record material decision changes in `03_PRODUCT_DECISIONS.md`.
- Update algorithm/catalog versions when behavior or content changes.
- Stop work that does not move the product toward a safer, clearer, retained, and commercially testable adaptive loop within sustainable student-founder constraints.

## 13. Immediate next actions

1. Define concrete algorithm fixtures for all mandatory scenarios.
2. Audit candidate exercise assets and licenses, using approved open-source datasets only for discovery until each item passes license and content review.
3. Obtain qualified English and Turkish exercise-content review.
4. Recheck current store health, privacy, analytics-retention, and subscription rules before public-launch implementation.
5. Create the initial project skeleton only after those implementation inputs are sufficiently clear.
