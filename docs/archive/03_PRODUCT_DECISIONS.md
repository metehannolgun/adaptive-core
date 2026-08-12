# Adaptive Core — Product Decisions

## 1. Decision policy

This register separates settled direction from deferred ideas. “Deferred” means “not in MVP,” not an implicit commitment. A settled decision changes only when new evidence is recorded.

## 2. Accepted decisions

### D-001 — Build a global product with a narrow first user

**Decision:** The long-term market is global; the MVP targets busy beginner and early-intermediate home exercisers.  
**Reason:** Global ambition does not justify serving every persona at launch.

### D-002 — Sell progress, not workouts

**Decision:** Product value is sustainable, visible progression.  
**Reason:** Exercise content is abundant; appropriate next-step programming is the unmet job.

### D-003 — Generate after performance

**Decision:** The next workout is created from stored user state and recent outcomes, not from a fixed day number.  
**Reason:** This is the central functional difference from challenge apps.

### D-004 — Use a deterministic rules engine in MVP

**Decision:** Adaptation is code and structured data, not a generative-AI API.  
**Reason:** It is cheaper, explainable, testable, and sufficient to validate the thesis.

### D-005 — Keep feedback lightweight

**Decision:** Capture completion, perceived difficulty, and pain/discomfort; allow exercise replacement.  
**Reason:** These inputs can materially change programming without burdensome tracking.

### D-006 — Make recovery part of progression

**Decision:** Hard, incomplete, or painful sessions can hold, reduce, regress, replace, or delay load.  
**Reason:** More load is not always progress.

### D-007 — Use controlled variation

**Decision:** Variety is bounded by movement pattern, level, recent exposure, fatigue, exclusions, and progression chain.  
**Reason:** Pure randomness can be unsafe, repetitive at the pattern level, and hard to measure.

### D-008 — Offer short time budgets

**Decision:** The core session choices are approximately 5, 10, and 15 minutes.  
**Reason:** They match the initial user’s real-life constraint and make the daily action clear.

### D-009 — Separate user vocabulary from engine taxonomy

**Decision:** UI may use upper abs, lower abs, obliques, deep core, and stability; engine logic uses movement patterns.  
**Reason:** Simple communication and balanced programming require different abstractions.

### D-010 — Launch with lightweight exercise media

**Decision:** Use commercially permitted GIF, SVG, Lottie, or equivalent short-loop assets plus concise cues.  
**Reason:** Professional video production is too expensive before validation.

### D-011 — Build cross-platform with the agreed lean stack

**Decision:** React Native, Expo, TypeScript, Supabase, PostHog, RevenueCat when needed, and a compatible push-notification path.  
**Reason:** One small team can ship iOS and Android while controlling cost.

### D-012 — Protect pricing trust

**Decision:** Terms must be transparent and existing entitlements must not be silently degraded.  
**Reason:** Competitor complaints show that broken pricing trust creates severe dissatisfaction.

### D-013 — Validate before paid growth

**Decision:** Recruit a closed beta and evaluate retention before material ad spend.  
**Reason:** Acquisition spend cannot repair a product users do not return to.

### D-014 — Treat documentation as an accelerator

**Decision:** Maintain only documents that directly reduce implementation ambiguity or preserve decisions.  
**Reason:** The source conversation identified analysis paralysis as a project risk.

### D-015 — Validate monetization during a free closed beta

**Decision:** Keep the closed beta free, measure willingness to pay, package preference, and paywall intent transparently, then enable real payment only after the product, retention, safety, and purchase-operation gates pass.  
**Reason:** Waiting until the product is complete would test commercial viability too late, while charging the first closed-beta cohort would mix early product defects with price response and risk trust.

### D-016 — Operate as a student solo-founder startup

**Decision:** Treat the founder’s education, sustainable weekly capacity, and near-zero personal budget as hard planning constraints. The 60–90-day target guides sequencing but does not justify academic harm, debt, or unsustainable working hours.  
**Reason:** The startup must be executable by its actual founder, not by an assumed full-time funded team.

### D-017 — Launch the MVP in English and Turkish

**Decision:** Support English and Turkish from the MVP, select the initial locale from the device, and allow manual override on Welcome and in Settings. General copy may fall back to English at runtime, but missing safety or exercise content in either required locale blocks release.  
**Reason:** The product retains global reach while treating the Turkish market as a first-class launch audience without expanding to uncontrolled localization scope.

### D-018 — Restrict MVP use to adults and layer safety copy

**Decision:** Limit the MVP to users aged 18 or older and present safety through a required first-use scope notice, contextual stop/pain messages, and detailed information in Settings. The app remains general fitness guidance, not a medical device, diagnostic tool, treatment, or rehabilitation service.  
**Reason:** Adult-only scope and contextual warnings reduce avoidable legal, consent, and safety complexity while keeping critical guidance visible when it matters.

### D-019 — Put ongoing adaptation behind payment after two workouts

**Decision:** Include onboarding, baseline, and the first two adaptive workouts without charge. After the user experiences adaptation, ongoing workout generation and long-term adaptive training require membership. Safety, historical user data, privacy controls, account deletion, and purchase management are never paywalled.  
**Reason:** Users experience the product’s differentiating value before payment, while the student startup tests a sustainable revenue model early and transparently.

## 3. Explicitly rejected for MVP

| Item | Decision | Reason |
|---|---|---|
| Static 30-day plan | Rejected | Contradicts adaptive promise |
| AI chat coach | Rejected | Cost, safety, and unnecessary complexity |
| Camera-based form analysis | Rejected | High scope and validation burden |
| Meal planner | Rejected | Outside core problem |
| Social feed | Rejected | Moderation and distraction |
| Public challenges | Rejected | Not needed to validate adaptation |
| Coach marketplace | Rejected | Two-sided-market complexity |
| Exercise marketplace | Rejected | Outside initial value loop |
| Professional custom video library | Rejected before validation | Capital should follow evidence or revenue |
| Advanced-athlete programming | Rejected | Conflicts with narrow first user |
| Spot-reduction or guaranteed six-pack claims | Rejected | Misleading and damaging to trust |

## 4. Deferred, not decided

- HealthKit, Google Health Connect, and wearable support;
- an application-side natural-language coach;
- readiness questionnaire beyond essential soreness/energy inputs;
- weekly formal performance tests;
- XP, missions, unlock trees, streak protection, and rich heatmaps;
- shareable progress cards;
- full offline workout generation;
- proprietary professional media;
- equipment-based exercises;
- push-up, pull-up, squat, mobility, running, and full-body modules;
- exact subscription price, billing period, and final store package details;
- lifetime purchase option;
- localization beyond English and Turkish.

These ideas require post-MVP evidence and must pass the feature filter.

## 5. Decision constraints

### Safety

- Pain is never treated as an ordinary effort signal.
- The system stops or replaces the affected movement and shows conservative guidance.
- The app does not diagnose or prescribe rehabilitation.
- MVP use is limited to adults aged 18 or older.
- Exercise metadata, safety copy, and localized exercise content require qualified review before public launch.
- Missing English or Turkish safety/exercise content blocks release.

### Trust

- Explain material workout changes.
- Preserve entitlement history.
- Preserve access to historical user data and safety controls when membership ends.
- Avoid fake personalization and unsupported health claims.
- Record why an exercise was replaced or excluded.

### Cost

- No paid API is part of the MVP product loop.
- Every third-party asset requires a recorded commercial-use license.
- Current service pricing and free tiers must be verified before dependency decisions are finalized.
- No paid advertising, professional media production, or optional SaaS expense is approved before retention and commercial-intent evidence justify it.
- Store-account and other unavoidable launch fees are paid only when the corresponding release is ready and the founder explicitly approves the expense.

## 6. Working roles

- Human founder: student, CEO, product owner, and solo implementing developer.
- AI collaborator: technical co-founder-style product and engineering advisor.

The AI role is to surface trade-offs and inconsistencies, not to replace qualified medical, legal, financial, or exercise-science review.

## 7. Change record format

For any future material decision, record:

```text
ID:
Date:
Status: proposed | accepted | rejected | superseded
Problem:
Decision:
Evidence:
Alternatives considered:
Consequences:
Documents affected:
```
