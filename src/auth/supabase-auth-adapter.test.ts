import {
  AuthError,
  AuthRetryableFetchError,
  type SupabaseClient,
} from "@supabase/supabase-js";

import {
  createSecureSessionStorage,
  SessionStorageError,
  type SecureStoreBackend,
  type SupabaseSessionStorage,
} from "./secure-session-storage";
import { createIdentityService } from "./identity-service";
import { createSupabaseAuthAdapter } from "./supabase-auth-adapter";
import type { Database } from "../database/database.types";

type AuthMethods = Pick<
  SupabaseClient<Database>["auth"],
  "getClaims" | "signInAnonymously" | "signOut"
>;

const sessionStorage: SupabaseSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
const authStorageKey = "adaptive-core-auth";

function createClient() {
  const auth = {
    getClaims: jest.fn(),
    signInAnonymously: jest.fn(),
    signOut: jest.fn(),
  } as unknown as AuthMethods;

  return {
    auth,
    client: { auth } as Pick<SupabaseClient<Database>, "auth">,
  };
}

function session(userId: string, isAnonymous: boolean) {
  return {
    access_token: "access-token-that-must-never-leave-the-adapter",
    refresh_token: "refresh-token-that-must-never-leave-the-adapter",
    user: { id: userId, is_anonymous: isAnonymous },
  };
}

function verifiedClaims(userId: string, isAnonymous: boolean) {
  return {
    data: {
      claims: { sub: userId, is_anonymous: isAnonymous },
      header: {},
      signature: new Uint8Array(),
    },
    error: null,
  };
}

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

describe("createSupabaseAuthAdapter", () => {
  it("maps only verified claims to token-free guest and permanent identities", async () => {
    const { auth, client } = createClient();
    auth.getClaims = jest
      .fn()
      .mockResolvedValueOnce(verifiedClaims("guest-a", true))
      .mockResolvedValueOnce(verifiedClaims("member-a", false))
      .mockResolvedValueOnce({ data: null, error: null });
    const adapter = createSupabaseAuthAdapter(
      client,
      sessionStorage,
      authStorageKey,
    );

    await expect(adapter.getCurrentIdentity()).resolves.toEqual({
      ok: true,
      identity: { userId: "guest-a", isAnonymous: true },
    });
    await expect(adapter.getCurrentIdentity()).resolves.toEqual({
      ok: true,
      identity: { userId: "member-a", isAnonymous: false },
    });
    await expect(adapter.getCurrentIdentity()).resolves.toEqual({
      ok: true,
      identity: null,
    });
  });

  it("maps verified-claims network failures to offline without publishing local identity", async () => {
    const { auth, client } = createClient();
    auth.getClaims = jest
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: new AuthRetryableFetchError("temporary failure", 503),
      })
      .mockResolvedValueOnce({
        data: null,
        error: new AuthError("offline", 0),
      });
    const adapter = createSupabaseAuthAdapter(
      client,
      sessionStorage,
      authStorageKey,
    );

    await expect(adapter.getCurrentIdentity()).resolves.toEqual({
      ok: false,
      kind: "network",
    });
    await expect(adapter.getCurrentIdentity()).resolves.toEqual({
      ok: false,
      kind: "network",
    });
  });

  it.each([
    "bad_jwt",
    "invalid_jwt",
    "session_not_found",
    "refresh_token_not_found",
    "refresh_token_already_used",
  ])("maps %s to invalid_session", async (code) => {
    const { auth, client } = createClient();
    auth.getClaims = jest.fn().mockResolvedValue({
      data: null,
      error: new AuthError("provider detail", 401, code),
    });

    await expect(
      createSupabaseAuthAdapter(
        client,
        sessionStorage,
        authStorageKey,
      ).getCurrentIdentity(),
    ).resolves.toEqual({ ok: false, kind: "invalid_session" });
  });

  it("clears an SDK invalid_jwt session and restores to no_session", async () => {
    const { auth, client } = createClient();
    auth.getClaims = jest
      .fn()
      .mockResolvedValueOnce({
        data: null,
        error: new AuthError("provider detail", 401, "invalid_jwt"),
      })
      .mockResolvedValueOnce({ data: null, error: null });
    auth.signOut = jest.fn().mockResolvedValue({ error: null });
    const service = createIdentityService(
      createSupabaseAuthAdapter(client, sessionStorage, authStorageKey),
    );

    await expect(service.restore()).resolves.toEqual({ status: "no_session" });
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(auth.getClaims).toHaveBeenCalledTimes(1);
  });

  it("distinguishes corrupt session storage from an unavailable backend", async () => {
    const { auth, client } = createClient();
    auth.getClaims = jest
      .fn()
      .mockRejectedValueOnce(new SessionStorageError("CORRUPT_SESSION_STORAGE"))
      .mockRejectedValueOnce(
        new SessionStorageError("SESSION_STORAGE_UNAVAILABLE"),
      );
    const adapter = createSupabaseAuthAdapter(
      client,
      sessionStorage,
      authStorageKey,
    );

    await expect(adapter.getCurrentIdentity()).resolves.toEqual({
      ok: false,
      kind: "corrupt_storage",
    });
    await expect(adapter.getCurrentIdentity()).resolves.toEqual({
      ok: false,
      kind: "storage",
    });
  });

  it("verifies anonymous sign-in claims and ignores a mismatched local user object", async () => {
    const { auth, client } = createClient();
    auth.signInAnonymously = jest.fn().mockResolvedValue({
      data: {
        session: session("forged-local-user", false),
        user: { id: "forged-local-user", is_anonymous: false },
      },
      error: null,
    });
    auth.getClaims = jest.fn().mockResolvedValue(
      verifiedClaims("verified-guest", true),
    );

    const result = await createSupabaseAuthAdapter(
      client,
      sessionStorage,
      authStorageKey,
    ).signInAnonymously();

    expect(result).toEqual({
      ok: true,
      identity: { userId: "verified-guest", isAnonymous: true },
    });
    expect(JSON.stringify(result)).not.toContain("forged-local-user");
    expect(JSON.stringify(result)).not.toContain(
      "access-token-that-must-never-leave-the-adapter",
    );
  });

  it("does not publish anonymous identity when post-sign-in verification is unavailable", async () => {
    const { auth, client } = createClient();
    auth.signInAnonymously = jest.fn().mockResolvedValue({
      data: {
        session: session("unverified-local-user", true),
        user: { id: "unverified-local-user", is_anonymous: true },
      },
      error: null,
    });
    auth.getClaims = jest.fn().mockResolvedValue({
      data: null,
      error: new AuthRetryableFetchError("jwks unavailable", 503),
    });

    await expect(
      createSupabaseAuthAdapter(
        client,
        sessionStorage,
        authStorageKey,
      ).signInAnonymously(),
    ).resolves.toEqual({ ok: false, kind: "network" });
  });

  it("rejects verified-claim responses without a subject", async () => {
    const { auth, client } = createClient();
    auth.getClaims = jest.fn().mockResolvedValue({
      data: {
        claims: { is_anonymous: true },
        header: {},
        signature: new Uint8Array(),
      },
      error: null,
    });

    await expect(
      createSupabaseAuthAdapter(
        client,
        sessionStorage,
        authStorageKey,
      ).getCurrentIdentity(),
    ).resolves.toEqual({ ok: false, kind: "auth" });
  });

  it("signs out locally and never returns a provider error", async () => {
    const { auth, client } = createClient();
    auth.signOut = jest
      .fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({
        error: new AuthError("provider detail", 500, "unknown"),
      });
    const adapter = createSupabaseAuthAdapter(
      client,
      sessionStorage,
      authStorageKey,
    );

    await expect(adapter.signOutLocal()).resolves.toEqual({ ok: true });
    await expect(adapter.signOutLocal()).resolves.toEqual({
      ok: false,
      kind: "auth",
    });
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });

  it.each([
    {
      name: "malformed manifest",
      seed(values: Map<string, string>) {
        values.set("adaptive_core.adaptive-core-auth.manifest", "secret-value");
      },
    },
    {
      name: "missing committed chunk",
      seed(values: Map<string, string>) {
        values.set(
          "adaptive_core.adaptive-core-auth.manifest",
          JSON.stringify({ version: 1, generation: 1, chunks: 2 }),
        );
        values.set(
          "adaptive_core.adaptive-core-auth.chunk.1.0",
          "partial-secret",
        );
      },
    },
  ])("recovers end to end from $name before creating one guest", async ({ seed }) => {
    const { backend, values } = createMemoryBackend();
    seed(values);
    const storage = createSecureSessionStorage(backend);
    const auth = {
      getClaims: jest.fn(async (token?: string) => {
        if (token) {
          return verifiedClaims("verified-guest", true);
        }

        const stored = await storage.getItem("adaptive-core-auth");
        return stored === null
          ? { data: null, error: null }
          : verifiedClaims("unexpected-existing-user", false);
      }),
      signInAnonymously: jest.fn(async () => {
        await storage.setItem("adaptive-core-auth", "stored-session");
        return {
          data: {
            session: session("unverified-local-user", false),
            user: { id: "unverified-local-user", is_anonymous: false },
          },
          error: null,
        };
      }),
      signOut: jest.fn(async () => ({ error: null })),
    } as unknown as AuthMethods;
    const adapter = createSupabaseAuthAdapter(
      { auth } as Pick<SupabaseClient<Database>, "auth">,
      storage,
      authStorageKey,
    );
    const service = createIdentityService(adapter);

    await expect(service.restore()).resolves.toEqual({ status: "no_session" });
    await expect(storage.getItem("adaptive-core-auth")).resolves.toBeNull();
    await expect(service.ensureGuestSession()).resolves.toEqual({
      status: "guest",
      userId: "verified-guest",
    });
    await expect(service.ensureGuestSession()).resolves.toEqual({
      status: "guest",
      userId: "verified-guest",
    });
    expect(auth.signInAnonymously).toHaveBeenCalledTimes(1);
  });
});
