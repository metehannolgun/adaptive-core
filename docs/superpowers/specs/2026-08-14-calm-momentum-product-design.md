# Adaptive Core — Calm Momentum Product Design

**Status:** Approved design specification

**Date:** 2026-08-14

**Scope:** Product UI foundation, core-loop screen architecture, and marketing-to-product continuity

## 1. Design thesis

Adaptive Core should feel like a precise training tool made for a human body: calm while the user decides, focused while the user moves, and reflective while the product explains what it learned.

The permanent product promise is:

> Short core workouts that adapt to how you actually perform.

The interface must prove this promise through a visible cause-and-effect relationship:

> User feedback → a meaningful change → a plain-language reason

The product must not present adaptation as artificial intelligence, magic, or an opaque coach. It is deterministic, explainable, and controlled by the user's performance and safety feedback.

## 2. Goals

- Help a beginner understand the product and start safely without an account.
- Reduce decision burden without removing meaningful user control.
- Make the first adaptation the product's primary “aha” moment.
- Build competence through clear instructions and understandable progress.
- Create a distinctive fitness identity without aggressive gym culture, generic wellness styling, or AI-product clichés.
- Keep the marketing promise, onboarding questions, workout experience, and adaptation explanation consistent.
- Support English and Turkish, light and dark modes, Dynamic Type, and accessible interaction.

## 3. Non-goals

- Gamification through streak pressure, levels, XP, badges, leaderboards, or social comparison.
- Transformation imagery, medical claims, shame, fake urgency, or hidden commercial terms.
- A content-feed home screen or a workout-library-first experience.
- AI avatars, chat interfaces, sparkles, glassmorphism, neon gradients, or “AI generated” badges.
- Decorative metrics that do not help the current decision.
- Redesigning product behavior defined by the MVP, safety, algorithm, or analytics specifications.

## 4. Research synthesis

The design direction combines five findings:

1. **Autonomy and competence support continued exercise.** The user needs meaningful control and repeated evidence that they can complete an appropriate session.
2. **Self-monitoring, feedback, goal setting, and instructions are common useful behavior-change techniques.** Adaptive Core should use feedback and progress explanation without turning them into judgment or competition.
3. **Lower visual complexity improves immediate comprehension.** Each screen should have a familiar hierarchy and one dominant purpose.
4. **Marketing and product congruence reduce uncertainty.** The store page must show the same mechanism the user experiences after the first workout.
5. **Trust is part of persuasion in a health-and-fitness product.** Privacy, safety, and commercial choices must remain explicit and under user control.

These findings are design inputs, not guaranteed conversion outcomes. Beta behavior must validate the resulting hypotheses.

## 5. Brand behavior: Calm Momentum

Calm Momentum is the primary identity. It has three contextual modes:

### 5.1 Calm mode

Used while understanding, choosing, previewing, and reporting.

- Mineral light canvas
- Generous spacing
- Low card density
- Deep teal controls
- One dominant action

### 5.2 Focus mode

Used during an active baseline or workout.

- Carbon canvas
- Higher contrast
- Stronger condensed typography
- Exercise media as the visual focus
- One movement, one critical cue, and one dominant completion action
- Pain/stop remains immediately visible

### 5.3 Reflect mode

Used for “What we learned,” progress, and safe recovery explanations.

- Quiet teal-tinted surface
- Adaptation Thread as the main structural element
- Factual, non-judgmental language
- Progress compared only with the user's prior state

The modes change visual intensity, not product vocabulary or navigation rules.

## 6. Visual foundation

### 6.1 Core palette

| Token | Value | Purpose |
|---|---:|---|
| `mineral` | `#ECEFEB` | Primary light canvas |
| `chalk` | `#F8F8F4` | Active surfaces and high-contrast light text |
| `carbon` | `#17221F` | Primary text and focused player canvas |
| `deepTeal` | `#17685D` | Primary action, control, and trust |
| `copper` | `#C88155` | Meaningful adaptation or changed state |
| `borderLight` | `#D5DAD5` | Quiet separation |
| `textSecondaryLight` | `#596560` | Secondary copy |
| `dangerLight` | `#A75442` | Pain, error, or destructive action only |

Copper is not a general accent. It appears only when something changed or when the interface points to the cause of a change. This restriction makes adaptation recognizable without adding decoration.

Dark mode uses the same semantic roles with accessible variants:

| Token | Value | Purpose |
|---|---:|---|
| `canvasDark` | `#121815` | Dark canvas |
| `surfaceDark` | `#1E2925` | Dark grouped surface |
| `textPrimaryDark` | `#F4F5F1` | Primary dark-mode text |
| `textSecondaryDark` | `#B8C2BD` | Secondary dark-mode text |
| `primaryDark` | `#75C9B9` | Interactive primary on dark surfaces |
| `copperDark` | `#E09A6E` | Changed state on dark surfaces |
| `dangerDark` | `#E1A18F` | Pain/error on dark surfaces |

All foreground/background pairs must pass WCAG AA contrast checks during implementation. Color must never be the only indication of selection, danger, or change.

### 6.2 Typography

- **Display:** Barlow Semi Condensed, weights 600 and 700, for major headlines, workout names, timers, and prescribed load.
- **Body:** platform system sans-serif for instructions, descriptions, choices, and controls.
- **Utility:** system sans-serif semibold with restrained letter spacing for progress, duration, set count, and context labels.

The condensed display face is the deliberate visual risk. It adds athletic character without turning the whole product into an aggressive performance dashboard. It must be used selectively; body copy remains familiar and highly readable.

Before implementation, confirm that the selected Barlow files render all required English and Turkish glyphs. If they fail, select another open-source condensed family with equivalent metrics and full Turkish coverage before coding screens.

### 6.3 Layout and surfaces

- Screen content follows safe areas and uses a maximum readable width.
- Onboarding and explanation screens use generous vertical space.
- Cards group a decision or a related explanation; text is not automatically placed in a card.
- Nested cards are prohibited.
- Buttons use a modest radius rather than pill shapes.
- Selected options change border, surface, and an icon or mark—not color alone.
- Exercise media provides most of the visual energy.
- Dark surfaces are concentrated in active training rather than scattered throughout the app.

### 6.4 Signature element: Adaptation Thread

The Adaptation Thread is a short path with three labeled states:

1. User feedback
2. Meaningful change
3. Next workout

The changed node uses copper and a distinct filled shape. The thread appears in Today, What We Learned, and relevant Progress views. It must always be paired with plain-language text and never become an unexplained chart.

The thread can reveal in sequence after an adaptation is calculated. With Reduce Motion enabled, it renders immediately without animation.

## 7. Experience architecture

The permanent interaction rule is:

> One screen, one decision, one visible consequence.

### 7.1 Understand

Welcome communicates the adaptive promise, short durations, and lack of a fixed calendar. Optional analytics is explained plainly. Sharing and declining are both visible and product access is identical.

**Psychological job:** establish relevance and trust before asking for effort.

### 7.2 Personalize

Experience, duration, and limitations remain three single-question steps. Progress is visible. The interface explains why each answer matters and presents only the required choices.

**Psychological job:** create autonomy without choice overload.

### 7.3 Decide

Today shows one recommended workout, duration, movement count, equipment requirement, and “Why this workout?” The user can preview or adjust duration, but the screen is not a content library.

**Psychological job:** remove planning burden while preserving control.

### 7.4 Move

The player shows one exercise, current prescription, set position, one critical cue, and exercise media. Details, breathing, mistakes, and stop conditions are available on demand. Pause, replace, end, and pain actions remain reachable without competing with the primary completion action.

**Psychological job:** keep attention on controlled movement and immediate safety.

### 7.5 Report

The user reports easy, appropriate, hard, incomplete, or pain. The interface states that there is no best answer. Pain is visually and behaviorally separate from effort.

**Psychological job:** make honest reporting safer than performing for a score.

### 7.6 Understand the result

What We Learned renders the correct adaptation reason and Adaptation Thread. It explains what changed, what stayed familiar, and why. It does not expose internal algorithm details that do not help the user.

**Psychological job:** turn personalization into visible proof.

## 8. Shared UI boundaries

The implementation should grow around a small set of shared responsibilities:

- **Screen frame:** safe-area handling, maximum width, background mode, and vertical rhythm.
- **Context header:** progress, screen context, current movement, and optional secondary navigation.
- **Choice group:** single- and multi-selection with consistent accessible states.
- **Action dock:** one dominant action plus optional safe alternatives.
- **Adaptation Thread:** reason-code presentation, not adaptation calculation.
- **Exercise stage:** media, current prescription, current cue, and media fallback.
- **Safety action:** pain/stop behavior with immediate navigation to the protective flow.

Presentational components receive typed product state. They do not calculate workouts, infer safety decisions, call analytics directly, or contain untranslated user-facing strings.

## 9. State and data flow

```text
Persisted product state
        ↓
Typed screen view model
        ↓
Calm / Focus / Reflect presentation
        ↓
Explicit user action
        ↓
Product action persisted
        ↓
Optional analytics boundary
```

Adaptation reason codes are produced by the engine and mapped to approved localized copy before reaching the presentation component. Pain bypasses ordinary difficulty handling and starts the protective flow immediately.

## 10. Error, offline, and fallback behavior

- Media failure keeps the movement name, prescription, critical cue, and stop action visible.
- An interrupted workout restores the focused player without emitting a duplicate start event.
- A cached workout remains usable offline.
- If the next workout cannot be prepared offline, the UI explains that a connection is required; it does not show a generic error.
- Analytics failure is silent and cannot block product behavior.
- Empty Progress states explain what action creates progress instead of displaying decorative placeholders.
- Errors state what happened and the next useful action; they do not use apologetic or vague copy.

## 11. Motion and haptics

- Motion communicates cause and effect, state change, or navigation.
- Micro-interactions use approximately 200–300 ms; page transitions may use approximately 400 ms.
- Allowed properties are opacity, translation, and restrained scale.
- Adaptation Thread may reveal feedback, change, and result in sequence.
- Feedback selection may use a subtle scale and light haptic response.
- Pain/stop has no animation delay.
- No bounce, confetti, shake, decorative ambient motion, or timer-tick animation.
- Reduce Motion must provide an equivalent immediate state.

## 12. Accessibility requirements

- Minimum touch target: 44 pt; primary actions target at least 48 pt height.
- Minimum normal-text contrast: 4.5:1.
- Dynamic Type must not hide primary, pain, pause, or end-session controls.
- Every selection exposes role, label, selected/checked state, and hint where needed.
- Adaptation and progress never rely on color alone.
- Exercise media includes a text-cue fallback.
- English and Turkish layouts are tested independently; truncation is not solved by reducing body text below the accessible scale.
- Light mode, dark mode, increased contrast, bold text, and reduced motion are part of visual acceptance.

## 13. Marketing continuity

### 13.1 Store positioning

- **Name:** Adaptive Core
- **Descriptor:** Adaptive bodyweight core workouts
- **Supporting line:** 5, 10 or 15 minutes · No equipment
- **Primary promise:** Your next workout adapts to how you perform.

The initial store story uses five frames:

1. Adaptive promise and visible feedback-to-change mechanism
2. 5/10/15-minute low barrier and no equipment
3. Focused player: one movement and one critical cue
4. Honest five-outcome feedback
5. Guest-first access, privacy, and user control

English and Turkish store assets preserve the same hierarchy but may adjust line breaks and composition to suit each language.

### 13.2 Launch order

1. Closed beta
2. Organic and direct referral acquisition
3. Validate activation and second-workout return
4. Test store creative one variable at a time
5. Consider paid acquisition only after retention evidence is credible

Apple Product Page Optimization and Google Play store-listing experiments should test the first screenshot headline before broad visual redesigns. Results, not personal preference, choose between validated variants.

### 13.3 Ethical growth boundary

Do not use body-transformation promises, before/after imagery, fake urgency, shame, medical certainty, hidden trial terms, or “AI knows your body” language. Persuasion should make the useful action easier, not make refusal harder.

Commercial messaging follows the approved product boundary: the beta intent test appears only after at least two completed adaptive workouts and does not collect payment.

## 14. Measurement

Store conversion is measured through App Store Connect and Google Play Console. Product measurement remains inside the approved 11-event analytics contract.

Primary evaluation funnels:

- **Activation:** `onboarding_started → onboarding_completed → baseline_completed → workout_started(1) → workout_completed(1) → feedback_submitted → adaptation_viewed`
- **Core return:** `workout_completed(1) → workout_started(2)`
- **Second-workout completion:** `workout_started(2) → workout_completed(2)`
- **Commercial intent:** `paywall_viewed → upgrade_intent_selected`

Do not optimize time in app, notification opens, pain reports, or raw interaction volume. A short successful session is better than prolonged app usage.

## 15. Verification strategy

Implementation is accepted only when:

- Existing behavior tests remain green.
- Shared controls expose correct accessibility roles and states.
- User-facing copy comes from the EN/TR catalogs.
- Screens render in English and Turkish without clipped critical content.
- Light and dark theme variants pass contrast checks.
- Dynamic Type preserves primary and safety actions.
- Reduced Motion preserves all state information.
- Media failure, offline use, and interrupted-workout restoration preserve the usable core flow.
- Analytics follows the exact consent and event contract.
- Manual visual QA covers representative small and large iOS and Android viewports.

## 16. Research sources

- [Exercise, physical activity, and self-determination theory: systematic review](https://pmc.ncbi.nlm.nih.gov/articles/PMC3441783/)
- [Mobile apps for health behavior change: systematic review](https://pmc.ncbi.nlm.nih.gov/articles/PMC7113799/)
- [Persuasive technologies for physical activity: systematic review](https://pmc.ncbi.nlm.nih.gov/articles/PMC7861265/)
- [Implementation intentions and physical activity: systematic review and meta-analysis](https://pmc.ncbi.nlm.nih.gov/articles/PMC6235272/)
- [Digital behavior-change interventions for habit formation: systematic review](https://pmc.ncbi.nlm.nih.gov/articles/PMC11161714/)
- [Visual complexity and prototypicality in first impressions](https://research.google/pubs/the-role-of-visual-complexity-and-prototypicality-regarding-first-impression-of-websites-working-towards-understanding-aesthetic-judgments/)
- [Apple onboarding guidance](https://developer.apple.com/design/human-interface-guidelines/onboarding)
- [Apple health and fitness app guidance](https://developer.apple.com/health-fitness/)
- [Apple App Store product-page guidance](https://developer.apple.com/app-store/product-page/)
- [RevenueCat State of Subscription Apps 2026](https://www.revenuecat.com/state-of-subscription-apps-2026-utilities)

Competitor references included current official product, support, and store materials from Fitbod, Freeletics, Nike Training Club, Seven, Ladder, Zing, Gentler Streak, Down Dog, Bend, Centr, and Apple Fitness+.
