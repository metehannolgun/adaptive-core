# Exercise Database — Implementation Reference

## Taxonomy

### Engine Movement Patterns
`trunk_flexion` | `anti_extension` | `anti_rotation` | `rotation` | `lateral_stability` | `hip_control`

### User-Facing Focus Labels
`upper_abs` | `lower_abs` | `obliques` | `deep_core` | `stability`

### Load Modes
`reps` | `seconds` | `alternating_reps` | `tempo_reps`

## Canonical Schema

```typescript
type SupportedLocale = "en" | "tr";

type Exercise = {
  id: string;
  slug: string;
  status: "draft" | "reviewed" | "active" | "retired";
  primaryPattern: MovementPattern;
  secondaryPatterns: MovementPattern[];
  userFocusLabels: UserFocusLabel[];
  loadMode: "reps" | "seconds" | "alternating_reps" | "tempo_reps";
  level: 1 | 2 | 3 | 4 | 5;
  strengthDemand: 1 | 2 | 3 | 4 | 5;
  coordinationDemand: 1 | 2 | 3 | 4 | 5;
  fatigueScore: 1 | 2 | 3 | 4 | 5;
  equipment: EquipmentTag[];
  minLoad: number;
  maxLoad: number;
  loadStep: number;
  estimatedSecondsPerUnit: number;
  defaultSets: number;
  minRestSeconds: number;
  maxRestSeconds: number;
  setupSeconds: number;
  bilateral: boolean;
  contraindicationTags: string[];
  mediaId: string;
  metadataVersion: number;
  reviewedBy: string | null;
  reviewedAt: string | null;
};

type ExerciseContent = {
  exerciseId: string;
  locale: SupportedLocale;
  name: string;
  setupInstruction: string;
  cues: string[];            // max 3
  breathingCue: string;
  commonMistakes: string[];  // at least 1
  stopConditions: string[];
  altText: string;
  contentVersion: number;
  status: "draft" | "reviewed" | "active" | "retired";
  reviewedBy: string | null;
  reviewedAt: string | null;
};

type ExerciseRelation = {
  fromExerciseId: string;
  toExerciseId: string;
  type: "progression" | "regression" | "substitute";
  reason: string;
  status: "draft" | "reviewed" | "active";
};
```

`estimatedSecondsPerUnit` is engine metadata used only for duration
estimation. It is `1` for `seconds` exercises. Rep-based exercises use a
positive, reviewed per-exercise estimate because different movements take
different time to perform safely.

## Media Schema

Each asset requires: type (GIF/SVG/Lottie/WebP), source URL, creator, exact license ID, commercial-use permission, modification permission, attribution requirement, acquisition date, local checksum, reviewer, approval status, fallback image.

## Candidate Seed Library (~30 exercises)

| Exercise | Primary Pattern | Secondary | Load Mode | Role |
|---|---|---|---|---|
| Supine abdominal brace | anti_extension | — | seconds | Baseline/foundation |
| Dead bug heel tap | anti_extension | hip_control | alternating_reps | Foundation |
| Dead bug | anti_extension | hip_control | alternating_reps | Progression |
| Bird dog | anti_rotation | hip_control | alternating_reps | Foundation |
| Forearm plank from knees | anti_extension | — | seconds | Regression |
| Forearm plank | anti_extension | — | seconds | Foundation |
| High plank | anti_extension | — | seconds | Alternative |
| Side plank from knees | lateral_stability | anti_rotation | seconds | Regression |
| Side plank | lateral_stability | anti_rotation | seconds | Foundation |
| Modified curl-up | trunk_flexion | — | reps | Foundation candidate |
| Crunch | trunk_flexion | — | reps | Foundation candidate |
| Heel touch | lateral_stability | trunk_flexion | alternating_reps | Foundation candidate |
| Reverse crunch | trunk_flexion | hip_control | reps | Progression candidate |
| Bent-knee leg lower | anti_extension | hip_control | reps | Progression candidate |
| Hollow tuck hold | anti_extension | hip_control | seconds | Progression candidate |
| Hollow hold | anti_extension | hip_control | seconds | Advanced candidate |
| Slow mountain climber | anti_extension | hip_control | alternating_reps | Dynamic candidate |
| Cross-body mountain climber | rotation | anti_extension, hip_control | alternating_reps | Progression candidate |
| Bicycle crunch | rotation | trunk_flexion | alternating_reps | Dynamic candidate |
| Russian twist, feet supported | rotation | anti_extension | alternating_reps | Pending review |
| Seated knee tuck | trunk_flexion | hip_control | reps | Pending review |
| Toe touch | trunk_flexion | — | reps | Pending review |
| Leg raise, bent-knee | anti_extension | hip_control | reps | Pending review |
| Leg raise, straight-leg | anti_extension | hip_control | reps | Advanced candidate |
| Plank shoulder tap | anti_rotation | anti_extension | alternating_reps | Progression candidate |
| Bear plank hold | anti_extension | hip_control | seconds | Progression candidate |
| Bear shoulder tap | anti_rotation | anti_extension | alternating_reps | Progression candidate |
| Side plank reach | rotation | lateral_stability | reps | Advanced candidate |
| Glute bridge march | hip_control | anti_rotation | alternating_reps | Supporting candidate |
| Supine marching brace | anti_extension | hip_control | alternating_reps | Regression/foundation |

## Progression Graph Examples

```
supine marching brace → dead bug heel tap → dead bug → dead bug longer lever
forearm plank from knees → forearm plank → long-lever plank
side plank from knees → side plank → side plank reach
```

## Data Quality Checks

- Unique id and slug
- Active exercise has approved media + license
- Active exercise has reviewed+active `en` AND `tr` content
- EN/TR content records: same required fields, compatible safety meaning
- minLoad ≤ defaultLoad ≤ maxLoad
- Valid loadStep for load mode
- Positive, finite estimatedSecondsPerUnit
- Active non-foundation exercise has ≥1 reviewed regression
- No self-referencing or circular 2-node progression without approval
- Substitutes share compatible primary pattern, don't increase demand
- Both locale records have alt text and ≤3 primary cues
- Retired exercises remain resolvable for history
