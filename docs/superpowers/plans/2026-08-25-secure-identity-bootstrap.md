# Secure Identity Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore Supabase sessions from Expo SecureStore and create exactly one background guest identity without blocking offline onboarding.

**Architecture:** One typed Supabase client uses a chunked SecureStore adapter, while a provider-neutral `IdentityService` owns session restoration and anonymous sign-in. A small React bootstrap boundary keeps the native splash visible only during restore, then renders onboarding and retries transient guest creation in the background.

**Tech Stack:** Expo SDK 54, React Native 0.81, TypeScript strict mode, `@supabase/supabase-js`, `expo-secure-store`, `expo-splash-screen`, Jest, React Native Testing Library, local Supabase CLI 2.111.0, Docker, pgTAP.

**Spec:** `docs/superpowers/specs/2026-08-25-secure-identity-bootstrap-design.md`

## Global Constraints

- Preserve guest-first onboarding and never block it on network access.
- Use only `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in the mobile bundle.
- Never embed, log, persist, or return a service-role key, database password, OTP, access token, refresh token, or captured email body.
- Store Supabase session material only through the Expo SecureStore adapter; do not add AsyncStorage.
- Split SecureStore values into chunks no larger than 1,800 UTF-16 code units because Expo SDK 54 documents historical iOS rejection around 2,048 bytes.
- Use `SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY` and do not require biometrics for automatic token refresh.
- Keep one Supabase client and no Supabase imports under `src/engine/` or UI feature folders.
- Use `(select auth.uid())` ownership policies already committed; this plan does not edit existing migrations.
- Anonymous sign-in abuse protection, hosted CAPTCHA/Turnstile configuration, and 90-day inactive guest cleanup are production release gates, not hidden inside this local client slice.
- The current Expo SDK 54 dependency tree has a known npm-audit baseline of 16 transitive production findings (7 moderate, 9 high, 0 critical); this slice must introduce no new critical finding and no new high finding attributable to the added Auth dependencies. Never run `npm audit fix --force`, because the current suggested fix is a breaking Expo 57 upgrade.
- Every task follows RED → GREEN, ends with focused tests, and leaves all existing tests green.

---

## File Structure

```text
.env.example
App.tsx
index.ts
app.json
package.json
src/
├── auth/
│   ├── auth-boundaries.test.ts
│   ├── default-identity-service.ts
│   ├── identity-bootstrap.test.tsx
│   ├── identity-bootstrap.tsx
│   ├── identity-service.test.ts
│   ├── identity-service.ts
│   ├── secure-session-storage.test.ts
│   ├── secure-session-storage.ts
│   ├── supabase-auth-adapter.test.ts
│   └── supabase-auth-adapter.ts
├── config/
│   ├── public-env.test.ts
│   └── public-env.ts
└── database/
    ├── database.types.ts
    ├── supabase-client.test.ts
    └── supabase-client.ts
supabase/tests/
└── auth-anonymous-bootstrap.test.mjs
```

`src/config` validates public build configuration. `src/database` owns the only Supabase client. `src/auth` converts provider-specific Auth behavior into the app-facing identity state and coordinates startup. The integration test proves the real local Auth trigger and RLS path.

---

### Task 1: Install Mobile Auth Dependencies and Validate Public Configuration

**Files:**
- Create: `.env.example`
- Create: `src/config/public-env.ts`
- Create: `src/config/public-env.test.ts`
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `app.json`

**Interfaces:**
- Consumes: Expo SDK 54 configuration and the existing generated database types.
- Produces: `readPublicEnv(source): PublicEnvResult` for Task 3.

- [ ] **Step 1: Write the failing public-environment tests**

Create `src/config/public-env.test.ts`:

```ts
import { readPublicEnv } from "./public-env";

describe("readPublicEnv", () => {
  it("accepts only an HTTP(S) URL and publishable client key", () => {
    expect(
      readPublicEnv({
        EXPO_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_test",
      }),
    ).toEqual({
      ok: true,
      value: {
        supabaseUrl: "http://127.0.0.1:54321",
        supabasePublishableKey: "sb_publishable_local_test",
      },
    });
  });

  it.each([
    [{}, "MISSING_PUBLIC_CONFIG"],
    [
      {
        EXPO_PUBLIC_SUPABASE_URL: "not-a-url",
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_test",
      },
      "INVALID_PUBLIC_CONFIG",
    ],
    [
      {
        EXPO_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "service-role-value",
      },
      "FORBIDDEN_CLIENT_KEY",
    ],
  ])("rejects unsafe configuration without echoing values", (source, code) => {
    const result = readPublicEnv(source);

    expect(result).toEqual({ ok: false, code });
    expect(JSON.stringify(result)).not.toContain("service-role-value");
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- public-env
```

Expected: FAIL because `src/config/public-env.ts` does not exist.

- [ ] **Step 3: Implement the minimal typed validator**

Create `src/config/public-env.ts`:

```ts
export type PublicEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
};

export type PublicEnvErrorCode =
  | "MISSING_PUBLIC_CONFIG"
  | "INVALID_PUBLIC_CONFIG"
  | "FORBIDDEN_CLIENT_KEY";

export type PublicEnvResult =
  | { ok: true; value: PublicEnv }
  | { ok: false; code: PublicEnvErrorCode };

type PublicEnvSource = Partial<
  Record<
    | "EXPO_PUBLIC_SUPABASE_URL"
    | "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    string | undefined
  >
>;

export function readPublicEnv(source: PublicEnvSource): PublicEnvResult {
  const supabaseUrl = source.EXPO_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    source.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    return { ok: false, code: "MISSING_PUBLIC_CONFIG" };
  }

  if (!supabasePublishableKey.startsWith("sb_publishable_")) {
    return { ok: false, code: "FORBIDDEN_CLIENT_KEY" };
  }

  try {
    const url = new URL(supabaseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { ok: false, code: "INVALID_PUBLIC_CONFIG" };
    }
  } catch {
    return { ok: false, code: "INVALID_PUBLIC_CONFIG" };
  }

  return {
    ok: true,
    value: { supabaseUrl, supabasePublishableKey },
  };
}
```

- [ ] **Step 4: Install SDK-compatible dependencies**

Run:

```bash
npx expo install @supabase/supabase-js react-native-url-polyfill expo-secure-store expo-splash-screen
```

Expected: Expo selects SDK 54-compatible Expo packages; `package.json` and `package-lock.json` change. Do not add AsyncStorage, AES helpers, or a second Auth library.

- [ ] **Step 5: Add safe example configuration and native plugin settings**

Create `.env.example`:

```dotenv
EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=replace-with-local-publishable-key
```

Add `"expo-secure-store"` to `expo.plugins` in `app.json` and add the iOS export-compliance setting:

```json
"ios": {
  "supportsTablet": true,
  "config": {
    "usesNonExemptEncryption": false
  }
}
```

The SecureStore config plugin uses its default Android backup exclusion. Do not add biometric permission copy because this slice does not use `requireAuthentication`.

- [ ] **Step 6: Run focused and configuration checks**

Run:

```bash
npm test -- public-env
npx expo config --type public
npx expo install --check
npm audit --omit=dev
git diff --check
```

Expected: test PASS; Expo config resolves; dependencies are compatible; diff check is silent. The audit may retain the documented Expo/Metro baseline but adds no Auth-package high/critical finding. Inspect the public config output and confirm it contains no service-role credential.

- [ ] **Step 7: Commit Task 1**

```bash
git add .env.example app.json package.json package-lock.json src/config/public-env.ts src/config/public-env.test.ts
git commit -m "feat: configure secure mobile auth"
```

---

### Task 2: Build the Chunked SecureStore Session Adapter

**Files:**
- Create: `src/auth/secure-session-storage.ts`
- Create: `src/auth/secure-session-storage.test.ts`

**Interfaces:**
- Consumes: `expo-secure-store` async methods.
- Produces: `createSecureSessionStorage(backend?): SupabaseSessionStorage` for Task 3.

- [ ] **Step 1: Write failing adapter tests**

Create an in-memory `SecureStoreBackend` fake and tests covering:

```ts
import {
  SessionStorageError,
  createSecureSessionStorage,
  type SecureStoreBackend,
} from "./secure-session-storage";

function createMemoryBackend() {
  const values = new Map<string, string>();
  const backend: SecureStoreBackend = {
    getItemAsync: jest.fn(async (key) => values.get(key) ?? null),
    setItemAsync: jest.fn(async (key, value) => {
      values.set(key, value);
    }),
    deleteItemAsync: jest.fn(async (key) => {
      values.delete(key);
    }),
  };
  return { backend, values };
}

describe("createSecureSessionStorage", () => {
  it("round-trips a session larger than a single SecureStore item", async () => {
    const { backend } = createMemoryBackend();
    const storage = createSecureSessionStorage(backend);
    const value = "x".repeat(5_000);

    await storage.setItem("sb-project-auth-token", value);

    expect(await storage.getItem("sb-project-auth-token")).toBe(value);
    expect(backend.setItemAsync).toHaveBeenCalledWith(
      expect.stringContaining(".chunk."),
      expect.not.stringMatching(/^x{1801}/),
      expect.any(Object),
    );
  });

  it("returns null for an absent session", async () => {
    const { backend } = createMemoryBackend();
    const storage = createSecureSessionStorage(backend);

    await expect(storage.getItem("sb-project-auth-token")).resolves.toBeNull();
  });

  it("removes the manifest and every active chunk", async () => {
    const { backend, values } = createMemoryBackend();
    const storage = createSecureSessionStorage(backend);

    await storage.setItem("sb-project-auth-token", "x".repeat(5_000));
    await storage.removeItem("sb-project-auth-token");

    expect(values.size).toBe(0);
  });

  it("fails closed on a corrupt manifest without exposing data", async () => {
    const { backend, values } = createMemoryBackend();
    values.set("adaptive_core.sb-project-auth-token.manifest", "secret-value");
    const storage = createSecureSessionStorage(backend);

    const failure = await storage
      .getItem("sb-project-auth-token")
      .catch((error: unknown) => error);

    expect(failure).toEqual(
      new SessionStorageError("CORRUPT_SESSION_STORAGE"),
    );
    expect(JSON.stringify(failure)).not.toContain("secret-value");
  });
});
```

- [ ] **Step 2: Run the test and verify RED**

```bash
npm test -- secure-session-storage
```

Expected: FAIL because the adapter does not exist.

- [ ] **Step 3: Implement stable keys, chunking, and typed errors**

Create `src/auth/secure-session-storage.ts` with these exact public contracts:

```ts
import * as SecureStore from "expo-secure-store";

const CHUNK_LENGTH = 1_800;
const MAX_CHUNKS = 32;
const KEY_PATTERN = /^[A-Za-z0-9._-]+$/;

type Manifest = {
  version: 1;
  generation: number;
  chunks: number;
};

export type SessionStorageErrorCode =
  | "INVALID_SESSION_STORAGE_KEY"
  | "SESSION_TOO_LARGE"
  | "CORRUPT_SESSION_STORAGE"
  | "SESSION_STORAGE_UNAVAILABLE";

export class SessionStorageError extends Error {
  constructor(readonly code: SessionStorageErrorCode) {
    super(code);
    this.name = "SessionStorageError";
  }
}

export type SecureStoreBackend = Pick<
  typeof SecureStore,
  "getItemAsync" | "setItemAsync" | "deleteItemAsync"
>;

export type SupabaseSessionStorage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};
```

Implement helpers with these rules:

```ts
const secureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
} as const;

function baseKey(key: string) {
  if (!KEY_PATTERN.test(key)) {
    throw new SessionStorageError("INVALID_SESSION_STORAGE_KEY");
  }
  return `adaptive_core.${key}`;
}

function splitValue(value: string) {
  const chunks = value.match(new RegExp(`.{1,${CHUNK_LENGTH}}`, "gs")) ?? [];
  if (chunks.length > MAX_CHUNKS) {
    throw new SessionStorageError("SESSION_TOO_LARGE");
  }
  return chunks;
}

function parseManifest(value: string | null): Manifest | null {
  if (value === null) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "version" in parsed && parsed.version === 1 &&
      "generation" in parsed && Number.isSafeInteger(parsed.generation) &&
      "chunks" in parsed && Number.isInteger(parsed.chunks) &&
      parsed.chunks >= 0 && parsed.chunks <= MAX_CHUNKS
    ) {
      return parsed as Manifest;
    }
  } catch {
    // The stable error below intentionally excludes the stored value.
  }
  throw new SessionStorageError("CORRUPT_SESSION_STORAGE");
}
```

`setItem` reads the active manifest, writes all chunks under `generation + 1`, writes the new manifest last, then deletes the old generation. `getItem` reads only the manifest-selected generation and throws `CORRUPT_SESSION_STORAGE` if a chunk is absent. `removeItem` deletes the manifest and the active and immediately previous generation. Wrap native rejections as `SESSION_STORAGE_UNAVAILABLE` without including the native message, key, or value.

Serialize `setItem` and `removeItem` operations per Supabase storage key with a `Map<string, Promise<void>>`; concurrent refresh writes for the same key must execute in order. `getItem` reads the currently committed manifest without joining the write queue, so an in-progress generation is invisible until the manifest switch. Remove the map entry in `finally` after the latest write or removal completes.

- [ ] **Step 4: Add atomic-generation and native-failure tests**

Add tests that pause the second-generation write, prove readers still see the old manifest-selected value, then complete the write and prove readers see the new value. Add a backend that rejects with `new Error("raw-secret")` and assert the adapter exposes only `SESSION_STORAGE_UNAVAILABLE`.

- [ ] **Step 5: Run adapter and full Jest tests**

```bash
npm test -- secure-session-storage
npm test
npm run typecheck
```

Expected: focused tests PASS; existing 182 tests plus new tests PASS; TypeScript PASS.

- [ ] **Step 6: Commit Task 2**

```bash
git add src/auth/secure-session-storage.ts src/auth/secure-session-storage.test.ts
git commit -m "feat: store auth sessions securely"
```

---

### Task 3: Create the Single Managed Supabase Client and Auth Adapter

**Files:**
- Create: `src/database/supabase-client.ts`
- Create: `src/database/supabase-client.test.ts`
- Create: `src/auth/supabase-auth-adapter.ts`
- Create: `src/auth/supabase-auth-adapter.test.ts`

**Interfaces:**
- Consumes: `PublicEnv`, `SupabaseSessionStorage`, React Native `AppState`, generated `Database`.
- Produces: `createManagedSupabaseClient(...)`, `IdentityAuthPort`, and `createSupabaseAuthAdapter(client)` for Task 4.

- [ ] **Step 1: Write failing client-configuration tests**

Test that the client factory receives:

```ts
expect(createClient).toHaveBeenCalledWith(url, publishableKey, {
  auth: {
    storage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: expect.any(Function),
  },
});
```

Test the `AppState` callback separately: `active` calls `startAutoRefresh()`, while `background` and `inactive` call `stopAutoRefresh()`. Calling `dispose()` removes the AppState subscription and stops refresh.

- [ ] **Step 2: Run the client test and verify RED**

```bash
npm test -- supabase-client
```

Expected: FAIL because the client module does not exist.

- [ ] **Step 3: Implement the client factory**

At the top of `src/database/supabase-client.ts`, install the React Native URL polyfill once:

```ts
import "react-native-url-polyfill/auto";

import {
  createClient,
  processLock,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { AppState, type AppStateStatus } from "react-native";

import type { SupabaseSessionStorage } from "../auth/secure-session-storage";
import type { PublicEnv } from "../config/public-env";
import type { Database } from "./database.types";

export type ManagedSupabaseClient = {
  client: SupabaseClient<Database>;
  dispose(): void;
};
```

`createManagedSupabaseClient(config, storage, dependencies?)` creates exactly one typed client with the tested Auth options. Register exactly one AppState listener. Start refresh immediately when `AppState.currentState === "active"`; otherwise stop it. The optional dependency object accepts `createClient` and `appState` fakes for tests, but production defaults use the official functions.

- [ ] **Step 4: Write failing Auth-adapter tests**

Define fake Supabase responses and assert the adapter returns only token-free values:

```ts
expect(await adapter.getCurrentIdentity()).toEqual({
  ok: true,
  identity: { userId: "guest-a", isAnonymous: true },
});

expect(await adapter.signInAnonymously()).toEqual({
  ok: false,
  kind: "network",
});
```

Cover permanent users, no session, `AuthRetryableFetchError`/status `0`, invalid-session codes, other Auth errors, and local sign-out. Assert serialized results contain no access or refresh token.

- [ ] **Step 5: Implement the narrow provider adapter**

Create `src/auth/supabase-auth-adapter.ts`:

```ts
export type AuthIdentity = {
  userId: string;
  isAnonymous: boolean;
};

export type AuthPortFailureKind =
  | "network"
  | "invalid_session"
  | "storage"
  | "auth";

export type AuthPortResult =
  | { ok: true; identity: AuthIdentity | null }
  | { ok: false; kind: AuthPortFailureKind };

export type IdentityAuthPort = {
  getCurrentIdentity(): Promise<AuthPortResult>;
  signInAnonymously(): Promise<AuthPortResult>;
  signOutLocal(): Promise<{ ok: true } | { ok: false; kind: "auth" }>;
};
```

Map only `session.user.id` and `session.user.is_anonymous === true`. Catch `SessionStorageError` and map it to `storage`. Treat `AuthRetryableFetchError` or status `0` as `network`. Treat `bad_jwt`, `session_not_found`, `refresh_token_not_found`, and `refresh_token_already_used` as `invalid_session`. Map every other error to `auth`. Never propagate provider messages or response bodies.

- [ ] **Step 6: Run focused and full checks**

```bash
npm test -- supabase-client supabase-auth-adapter
npm test
npm run typecheck
```

Expected: all PASS.

- [ ] **Step 7: Commit Task 3**

```bash
git add src/database/supabase-client.ts src/database/supabase-client.test.ts src/auth/supabase-auth-adapter.ts src/auth/supabase-auth-adapter.test.ts
git commit -m "feat: add managed Supabase auth client"
```

---

### Task 4: Implement the Provider-Neutral IdentityService

**Files:**
- Create: `src/auth/identity-service.ts`
- Create: `src/auth/identity-service.test.ts`

**Interfaces:**
- Consumes: `IdentityAuthPort` from Task 3.
- Produces: `IdentityService`, `IdentityState`, `IdentityErrorCode`, and `createIdentityService(auth)` for Task 5.

- [ ] **Step 1: Write failing state-machine tests**

Create tests for these exact transitions:

```text
restoring + valid anonymous session → guest
restoring + valid permanent session → permanent
restoring + no session → no_session
restoring + network failure → offline
restoring + storage failure → error/SESSION_STORAGE_UNAVAILABLE
restoring + invalid session → local sign-out → no_session
restoring + invalid session + failed local sign-out → error/AUTH_UNAVAILABLE
no_session + anonymous success → guest
offline + anonymous success on retry → guest
guest/permanent + ensureGuestSession → same identity, no Auth call
two concurrent ensureGuestSession calls → one Auth call and same result
non-network Auth failure → error/AUTH_UNAVAILABLE
```

Also prove listeners receive only state objects and `unsubscribe()` stops delivery.

- [ ] **Step 2: Run the service test and verify RED**

```bash
npm test -- identity-service
```

Expected: FAIL because the service does not exist.

- [ ] **Step 3: Implement the state model and service**

Create `src/auth/identity-service.ts` with:

```ts
export type IdentityErrorCode =
  | "AUTH_UNAVAILABLE"
  | "SESSION_STORAGE_UNAVAILABLE"
  | "INVALID_PUBLIC_CONFIG";

export type IdentityState =
  | { status: "restoring" }
  | { status: "no_session" }
  | { status: "guest"; userId: string }
  | { status: "permanent"; userId: string }
  | { status: "offline" }
  | { status: "error"; code: IdentityErrorCode };

export type IdentityService = {
  restore(): Promise<IdentityState>;
  ensureGuestSession(): Promise<IdentityState>;
  getState(): IdentityState;
  subscribe(listener: (state: IdentityState) => void): () => void;
};
```

Use a closure for current state, listeners, and `guestRequest: Promise<IdentityState> | null`. `publish(next)` updates state and notifies a snapshot of listeners. `ensureGuestSession()` returns an existing guest/permanent state immediately and returns the existing `guestRequest` when one is active. Clear `guestRequest` in `finally` so an offline attempt can be retried.

Do not add email OTP, sign-out UI, provider linking, merge tickets, profile repositories, or workout repositories.

- [ ] **Step 4: Run focused tests, mutation check, and full checks**

```bash
npm test -- identity-service
npm test
npm run typecheck
```

Then temporarily remove the single-flight guard in the working tree, run the concurrent test and confirm RED with two Auth calls. Restore the guard immediately and confirm GREEN. Do not commit the mutation.

- [ ] **Step 5: Commit Task 4**

```bash
git add src/auth/identity-service.ts src/auth/identity-service.test.ts
git commit -m "feat: add guest identity service"
```

---

### Task 5: Integrate Splash-Safe, Offline-First Identity Bootstrap

**Files:**
- Create: `src/auth/default-identity-service.ts`
- Create: `src/auth/identity-bootstrap.tsx`
- Create: `src/auth/identity-bootstrap.test.tsx`
- Modify: `App.tsx`
- Modify: `index.ts`

**Interfaces:**
- Consumes: `readPublicEnv`, `createSecureSessionStorage`, `createManagedSupabaseClient`, `createSupabaseAuthAdapter`, `createIdentityService`.
- Produces: `IdentityBootstrap`, `useIdentityState()`, `defaultIdentityService`, and an app startup path that never blocks onboarding on guest network creation.

- [ ] **Step 1: Write failing bootstrap tests**

Use a fake `IdentityService`, fake splash port, and Jest fake timers. Prove:

```ts
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

it("hides the splash after restore and does not wait for guest creation", async () => {
  const guestRequest = deferred<IdentityState>();
  service.restore.mockResolvedValue({ status: "no_session" });
  service.ensureGuestSession.mockReturnValue(guestRequest.promise);

  const queries = render(
    <IdentityBootstrap service={service} splash={splash}>
      <Text>Onboarding</Text>
    </IdentityBootstrap>,
  );

  expect(queries.getByText("Onboarding")).toBeTruthy();
  await waitFor(() => expect(splash.hideAsync).toHaveBeenCalledTimes(1));
  expect(service.ensureGuestSession).toHaveBeenCalledTimes(1);
});
```

Add tests for restored guest/permanent sessions (no anonymous sign-in), offline retry delays of 1,000 ms, 3,000 ms, and 10,000 ms, maximum three automatic retries, unmount cancellation, and `useIdentityState()` subscription updates.

- [ ] **Step 2: Run the bootstrap test and verify RED**

```bash
npm test -- identity-bootstrap
```

Expected: FAIL because the bootstrap boundary does not exist.

- [ ] **Step 3: Implement default composition without throwing at module load**

In `src/auth/default-identity-service.ts`, call `readPublicEnv(process.env)`. When configuration is valid, compose the real storage, client, Auth adapter, and identity service exactly once. When configuration is invalid, return a small unavailable `IdentityService` whose `restore()` and `ensureGuestSession()` publish `{ status: "error", code: "INVALID_PUBLIC_CONFIG" }`; never throw before the splash can be hidden and never echo environment values.

- [ ] **Step 4: Implement the React bootstrap boundary**

`IdentityBootstrap` must:

- render `children` immediately behind the native splash;
- subscribe before calling `restore()`;
- hide the splash in `finally` after restore settles;
- call `ensureGuestSession()` only for `no_session` or `offline`;
- retry only when the resulting state is `offline`;
- use fixed delays `[1_000, 3_000, 10_000]` and stop afterward;
- clear pending timers and unsubscribe on unmount;
- provide the current `IdentityState` through React context;
- expose `useIdentityState()` that throws a stable developer error only when used outside the provider.

- [ ] **Step 5: Wire App and native splash**

Change `index.ts`:

```ts
import { registerRootComponent } from "expo";
import * as SplashScreen from "expo-splash-screen";

import App from "./App";

void SplashScreen.preventAutoHideAsync();
registerRootComponent(App);
```

Export a testable `AppRoot` while preserving the default entry:

```tsx
export function AppRoot({ identityService = defaultIdentityService }) {
  return (
    <IdentityBootstrap service={identityService}>
      <SafeAreaProvider>
        <RootNavigator />
        <StatusBar style="auto" />
      </SafeAreaProvider>
    </IdentityBootstrap>
  );
}

export default function App() {
  return <AppRoot />;
}
```

Type the optional service prop explicitly. Do not change `RootNavigator` flow or add loading/error copy.

- [ ] **Step 6: Run focused UI and full checks**

```bash
npm test -- identity-bootstrap RootNavigator
npm test
npm run typecheck
npx expo-doctor
```

Expected: bootstrap and navigation tests PASS; all suites PASS; strict TypeScript PASS; Expo Doctor passes every check.

- [ ] **Step 7: Commit Task 5**

```bash
git add App.tsx index.ts src/auth/default-identity-service.ts src/auth/identity-bootstrap.tsx src/auth/identity-bootstrap.test.tsx
git commit -m "feat: bootstrap guest identity safely"
```

---

### Task 6: Prove Local Anonymous Auth Provisioning and Security Boundaries

**Files:**
- Create: `supabase/tests/auth-anonymous-bootstrap.test.mjs`
- Create: `src/auth/auth-boundaries.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: local Supabase Auth, public schema trigger, owner RLS, and the completed mobile identity modules.
- Produces: `npm run auth:test:anonymous` and the final executable evidence for this slice.

- [ ] **Step 1: Add the integration script entry before the file exists**

Add to `package.json`:

```json
"auth:test:anonymous": "node supabase/tests/auth-anonymous-bootstrap.test.mjs"
```

Run:

```bash
npm run auth:test:anonymous
```

Expected: FAIL because the integration test file does not exist.

- [ ] **Step 2: Implement the local Auth integration test**

Create `supabase/tests/auth-anonymous-bootstrap.test.mjs` using Node built-ins plus `@supabase/supabase-js`:

1. Run the pinned local CLI with `supabase status --output json`.
2. Read `API_URL`, the publishable/anon key, and service-role key only into process memory.
3. Create a client with `persistSession: false`, `autoRefreshToken: false`, and `detectSessionInUrl: false`.
4. Call `auth.signInAnonymously()` and assert `user.id` exists and `user.is_anonymous === true`.
5. Query `profiles`, `training_preferences`, and `privacy_preferences` through the anonymous session and assert exactly one own row in each table.
6. Assert the profile has only the approved locale/timestamps/user ID, training defaults match the migration, and privacy consent is `pending`.
7. In `finally`, delete the fixture through a separate local admin client and sign out the anonymous client.
8. Print only `Local anonymous identity integration test passed.`

Every thrown message must use a stable operation name plus HTTP/status category. Never print keys, user IDs, JWTs, row bodies, or provider error messages.

- [ ] **Step 3: Add the source-boundary test**

Create `src/auth/auth-boundaries.test.ts` using `node:fs` and `node:path`. Read only:

```text
App.tsx
index.ts
src/auth/**/*.{ts,tsx}
src/config/**/*.ts
src/database/supabase-client.ts
src/engine/**/*.{ts,tsx}
src/features/**/*.{ts,tsx}
```

Assert:

- `service_role`, `SERVICE_ROLE_KEY`, and JWT-shaped literals do not appear in mobile source;
- `src/engine` and `src/features` contain no import from `@supabase/supabase-js`, `expo-secure-store`, or `../database/supabase-client`;
- only `src/database/supabase-client.ts` imports `createClient`;
- only `src/auth/secure-session-storage.ts` imports `expo-secure-store`.

Do not scan `supabase/tests`, because local integration tests intentionally request the local service-role key from CLI status at runtime.

- [ ] **Step 4: Run focused RED/GREEN checks**

```bash
npm run db:reset
npm run auth:test:anonymous
npm test -- auth-boundaries
```

Expected: clean reset PASS; anonymous integration PASS; boundary test PASS.

- [ ] **Step 5: Run the complete final verification**

```bash
npm run db:reset
npm run db:test
npm run auth:test:otp
npm run auth:test:anonymous
npm run db:lint
npm test
npm run typecheck
npx expo-doctor
npm audit --omit=dev
git diff --check codex/catalog-seed-v1..HEAD
git status --short --branch
```

Expected:

- all migrations apply from zero;
- all existing 138 pgTAP assertions pass;
- email OTP and anonymous Auth integration tests pass;
- DB lint reports no schema errors;
- all Jest suites pass;
- strict TypeScript passes;
- Expo Doctor passes every check;
- npm audit adds no critical finding and no new high finding attributable to the Auth dependencies; the documented Expo SDK 54 baseline is reported, not force-fixed;
- diff check is silent;
- status shows only the intentional protected root untracked files, not generated secrets or Supabase runtime state.

Run a final tracked-source search:

```bash
git grep -n -E 'SERVICE_ROLE_KEY|service.?role|eyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+' HEAD -- App.tsx index.ts src .env.example
```

Expected: no embedded service-role/JWT value. A defensive source-code string used by the boundary test may match `service.?role`; inspect it and confirm it is an assertion pattern, not a credential.

- [ ] **Step 6: Commit Task 6**

```bash
git add package.json supabase/tests/auth-anonymous-bootstrap.test.mjs src/auth/auth-boundaries.test.ts
git commit -m "test: verify anonymous identity bootstrap"
```

---

## Production Follow-Up Gate

This local/mobile foundation is not production Auth rollout approval. Before a hosted release enables anonymous sign-in:

1. Configure hosted anonymous sign-in and verify the same RLS matrix against the hosted staging project.
2. Add Cloudflare Turnstile or another Supabase-supported CAPTCHA flow without weakening background bootstrap semantics.
3. Keep anonymous sign-in rate limits bounded and alert on abnormal creation volume.
4. Schedule deletion of inactive, unlinked anonymous users and their records at 90 days as required by the parent security design.
5. Verify production SMTP, OTP template, redirect allowlist, TLS/network restrictions, backups, Security Advisor, store privacy declarations, and the applicable MASVS/ASVS evidence.
6. Re-evaluate the documented Expo SDK 54 npm advisories during the deliberate Expo SDK upgrade plan; do not use a forced major upgrade inside an Auth feature branch.
