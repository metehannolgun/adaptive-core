# Secure Identity Bootstrap Design

**Date:** 2026-08-25
**Status:** Approved in conversation
**Parent security design:** `docs/superpowers/specs/2026-08-21-identity-and-data-security-design.md`

## 1. Goal

Add the mobile identity foundation that restores a Supabase session from secure device storage and creates a guest identity without blocking onboarding. This slice introduces no profile UI, email OTP UI, account merge, Apple/Google sign-in, workout persistence, or production deployment.

## 2. Binding Product Decisions

- The first-value flow remains guest-first; account creation is not required for onboarding.
- Onboarding remains usable when the device is offline.
- The app keeps the native splash visible only while checking secure storage for an existing session.
- If no session exists, onboarding opens immediately and guest creation continues in the background.
- Cloud writes and future server-authoritative workout generation require a valid identity; they do not pretend to succeed while identity is unavailable.
- Email OTP and guest-to-account merge remain separate later slices.

## 3. Architecture

The app uses the official Supabase JavaScript client with one SecureStore-backed storage adapter and one application-facing `IdentityService`. UI, navigation, analytics, catalog, and the pure engine do not import Supabase Auth directly.

The planned responsibilities are:

```text
src/
├── auth/
│   ├── identity-service.ts        # Provider-neutral identity operations and state
│   ├── identity-service.test.ts
│   ├── secure-session-storage.ts  # Supabase storage adapter backed by SecureStore
│   ├── secure-session-storage.test.ts
│   ├── identity-bootstrap.tsx     # Splash-safe restore and background guest bootstrap
│   └── identity-bootstrap.test.tsx
├── database/
│   ├── database.types.ts          # Existing generated public schema contract
│   └── supabase-client.ts         # The single configured Supabase client
└── config/
    └── public-env.ts              # Validated public URL and publishable key only
```

Exact filenames may be refined by the implementation plan, but responsibilities must remain separated. The Supabase client is created once and injected into `IdentityService` so unit tests can use a narrow fake.

## 4. Public Configuration

The mobile app consumes only:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

These values identify the public project endpoint and client role; they are not authorization by themselves. The service-role key, database password, OTPs, access tokens, and refresh tokens must never appear in client configuration, committed files, logs, errors, or analytics.

Missing or malformed public configuration fails with a stable configuration error in development and test. Error text must not echo configuration values.

## 5. Secure Session Storage

The storage adapter implements the interface expected by Supabase Auth using Expo SecureStore:

- `getItem(key)` returns the stored session value or `null`.
- `setItem(key, value)` writes the value using platform-protected storage.
- `removeItem(key)` deletes the value.

Session material is never copied to AsyncStorage. Storage failures are converted to stable typed failures without including keys or values in their messages.

## 6. Identity State and Service

The application observes a small provider-neutral state:

```ts
type IdentityState =
  | { status: "restoring" }
  | { status: "guest"; userId: string }
  | { status: "permanent"; userId: string }
  | { status: "offline" }
  | { status: "error"; code: IdentityErrorCode };
```

The initial service surface is intentionally limited to this slice:

```ts
type IdentityService = {
  restore(): Promise<IdentityState>;
  ensureGuestSession(): Promise<IdentityState>;
  getState(): IdentityState;
  subscribe(listener: (state: IdentityState) => void): () => void;
};
```

`ensureGuestSession()` is single-flight: concurrent callers share one in-progress request, preventing multiple anonymous users. A valid existing permanent or guest session is reused. The service determines guest versus permanent from verified Supabase Auth claims, never from client-editable profile data.

## 7. Startup Data Flow

1. The native splash remains visible while `restore()` checks SecureStore and Supabase Auth state.
2. A valid stored guest or permanent session becomes the current identity.
3. An invalid or corrupt stored session is cleared through the Supabase client and reported as unavailable; raw session material is never logged.
4. When no session exists, the navigation tree renders onboarding immediately.
5. `ensureGuestSession()` starts in the background.
6. A successful anonymous sign-in publishes `guest` with its UUID.
7. A network failure publishes `offline` and remains retryable; it does not block onboarding.
8. A non-network Auth failure publishes a stable `error` code and does not retry forever.

The bootstrap coordinates startup only. It does not own navigation decisions or introduce profile/account screens.

## 8. Retry and Error Rules

- Only transient network failures are automatically retryable.
- Retry uses a bounded delay and never creates overlapping Auth requests.
- The service exposes a manual retry path for later UI integration.
- Authentication, storage, and configuration failures use stable allowlisted error codes.
- No error message includes an email, UUID, token, storage key, URL query, or provider response body.
- The app never fabricates an authenticated or guest state after a failed request.

## 9. Testing Strategy

Unit tests use dependency injection with fake storage and a narrow fake Auth client. They prove:

- SecureStore values can be written, restored, and removed.
- Storage failures do not expose keys or values.
- A valid stored session is restored.
- A missing session starts exactly one anonymous sign-in.
- Concurrent bootstrap calls share one anonymous sign-in.
- A permanent session is never replaced by a guest session.
- Offline startup does not prevent onboarding from rendering.
- Corrupt or expired session state is cleared safely.
- Non-network Auth errors do not enter an infinite retry loop.
- No client module imports or embeds service-role credentials.

A focused local Supabase integration test proves anonymous sign-in returns an authenticated anonymous user and that the database provisioning trigger creates the approved default identity rows. Existing pgTAP, Jest, strict TypeScript, DB lint, and Expo Doctor gates remain green.

## 10. Dependency and Platform Rules

- Use Expo-compatible versions installed through `npx expo install` where applicable.
- Add the maintained Supabase client and its required React Native compatibility dependency only if the current Expo SDK needs it.
- Do not add AsyncStorage for session material.
- Do not add SQLCipher in this slice; encrypted workout persistence is a later plan and will trigger the deliberate move away from Expo Go.
- Keep the adaptation engine pure: no React, SecureStore, or Supabase imports under `src/engine/`.

## 11. Completion Criteria

This slice is complete only when:

- The app restores a valid secure session without showing a separate loading screen.
- A first-time online user receives exactly one Supabase anonymous identity.
- A first-time offline user can continue onboarding and receives no false success state.
- Session secrets exist only behind the SecureStore adapter.
- UI and engine code have no direct Supabase Auth calls.
- Local anonymous Auth provisions the existing identity tables successfully.
- All focused and existing verification gates pass.
