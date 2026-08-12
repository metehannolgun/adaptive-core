# UI & Components — Agent Instructions

## Design Philosophy

Adaptive Core's interface must feel **calm, trustworthy, and focused**. The user is starting a fitness habit — the UI should remove anxiety, not add it. Every screen serves exactly one purpose.

### Core Principles

1. **Clarity over decoration** — No ornamental elements. Every visual element communicates function.
2. **Progressive disclosure** — Show only what the user needs now. Details on demand.
3. **Calm confidence** — Soft gradients, generous spacing, rounded corners. Never aggressive, never loud.
4. **Motion with purpose** — Animate only to show cause/effect or guide attention. No gratuitous animation.
5. **Accessibility first** — Minimum 4.5:1 contrast ratio. Touch targets ≥44pt. Support Dynamic Type.

## Design Tokens

### Color Palette

```typescript
const colors = {
  // Primary — Calm teal/blue-green
  primary: {
    50:  '#E6F7F5',
    100: '#B3E8E2',
    200: '#80D9CF',
    300: '#4DCABC',
    400: '#26BFA9',
    500: '#1AAF9C',  // Main brand
    600: '#159E8D',
    700: '#0F8A7B',
    800: '#0A7669',
    900: '#055A50',
  },

  // Neutral — Warm grays (not cold)
  neutral: {
    0:   '#FFFFFF',
    50:  '#F8F9FA',
    100: '#F1F3F4',
    200: '#E8EAED',
    300: '#DADCE0',
    400: '#BDC1C6',
    500: '#9AA0A6',
    600: '#80868B',
    700: '#5F6368',
    800: '#3C4043',
    900: '#202124',
    1000:'#000000',
  },

  // Semantic
  success: '#2E7D52',
  warning: '#E8A317',
  error:   '#C5221F',
  info:    '#1A73E8',

  // Feedback outcomes
  feedback: {
    easy:        '#2E7D52',
    appropriate: '#1AAF9C',
    hard:        '#E8A317',
    incomplete:  '#E07A2F',
    pain:        '#C5221F',
  },
};
```

### Typography

```typescript
const typography = {
  // Use system fonts for performance
  fontFamily: {
    primary: 'System',  // SF Pro on iOS, Roboto on Android
    mono: 'Courier',
  },
  sizes: {
    xs:    12,
    sm:    14,
    base:  16,   // Body text
    lg:    18,
    xl:    20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  weights: {
    regular:  '400',
    medium:   '500',
    semibold: '600',
    bold:     '700',
  },
  lineHeights: {
    tight:  1.2,
    normal: 1.5,
    relaxed:1.75,
  },
};
```

### Spacing & Layout

```typescript
const spacing = {
  xs:  4,
  sm:  8,
  md:  16,
  lg:  24,
  xl:  32,
  '2xl': 48,
  '3xl': 64,
};

const layout = {
  screenPadding: 20,
  cardRadius: 16,
  buttonRadius: 12,
  inputRadius: 10,
  maxContentWidth: 480,
};
```

### Shadows & Elevation

```typescript
const shadows = {
  sm: { shadowOffset: {width:0,height:1}, shadowRadius:3, shadowOpacity:0.08 },
  md: { shadowOffset: {width:0,height:2}, shadowRadius:8, shadowOpacity:0.12 },
  lg: { shadowOffset: {width:0,height:4}, shadowRadius:16, shadowOpacity:0.16 },
};
```

## Component Patterns

### Screen Structure
Every screen follows this layout hierarchy:
```
SafeAreaView
  └── ScrollView (or FlatList)
       └── Content container (maxWidth, horizontal padding)
            ├── Header (title, optional subtitle)
            ├── Body (primary content)
            └── Footer (primary CTA, sticky if needed)
```

### Button Hierarchy
- **Primary**: Filled, `primary.500` background, white text. One per screen.
- **Secondary**: Outlined, `primary.500` border, `primary.500` text.
- **Tertiary**: Text only, `primary.500` text. For skip/dismiss actions.
- **Destructive**: Outlined, `error` border. Only for irreversible actions.
- All buttons: min height 48pt, `buttonRadius`, `semibold` weight.

### Cards
- White background, `cardRadius`, `shadows.sm`
- Content padding: `spacing.lg`
- No nested cards

### Feedback Chips
- Each outcome has its own color from `feedback` palette
- Icon + label, rounded-full, touch target ≥ 44pt
- Selected state: filled background + white text
- Unselected: outlined + colored text

### Workout Player
- Exercise name: `2xl`, `semibold`
- Timer/counter: `4xl`, `bold`, `primary.500`
- Set indicator: discrete dots or "2 of 3" text
- Media area: 1:1 aspect ratio, `cardRadius`, loading skeleton
- Controls bar: bottom-fixed, safe-area aware

### Progress Indicators
- Weekly: simple circles or checkmarks (not streaks, not fire)
- Capacity: horizontal bars per pattern, `primary` gradient
- Never show raw numbers — visual progress only

## Animation Rules

- Duration: 200-300ms for micro-interactions, 400ms for page transitions
- Easing: ease-out for entrances, ease-in for exits
- Only animate: opacity, translateY, scale
- Never: color flash, shake, bounce, confetti
- Feedback selection: subtle scale(1.05) + haptic
- Card appearance: fadeIn + translateY(8→0)
- Timer tick: no animation (stable, calm)
- Pain/stop: immediate, no transition delay

## Dark Mode

- Support automatic dark mode via system preference
- Dark background: `neutral.900`
- Card background: `neutral.800`
- Primary colors stay vibrant (no desaturation)
- Maintain contrast ratios in both modes
- Test both modes before marking complete

## Anti-Patterns (Do NOT)

- ❌ Use red for anything other than pain/error/destructive
- ❌ Show countdown timers that create anxiety (use progress, not countdown)
- ❌ Add gamification (badges, levels, XP, fire streaks)
- ❌ Use exclamation marks in UI copy
- ❌ Add social comparison or leaderboards
- ❌ Use skeleton loaders longer than 1 second without explanation
- ❌ Auto-start exercises without explicit user action
- ❌ Nest navigations (no drawer inside tabs)
- ❌ Use platform-specific components without abstraction
