import {
  AuthError,
  AuthRetryableFetchError,
  type SupabaseClient,
} from "@supabase/supabase-js";

import { SessionStorageError } from "./secure-session-storage";
import { createSupabaseAuthAdapter } from "./supabase-auth-adapter";
import type { Database } from "../database/database.types";

type AuthMethods = Pick<
  SupabaseClient<Database>["auth"],
  "getSession" | "signInAnonymously" | "signOut"
>;

function createClient() {
  const auth = {
    getSession: jest.fn(),
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

describe("createSupabaseAuthAdapter", () => {
  it("maps an anonymous session to a token-free guest identity", async () => {
    const { auth, client } = createClient();
    auth.getSession = jest.fn().mockResolvedValue({
      data: { session: session("guest-a", true) },
      error: null,
    });
    const adapter = createSupabaseAuthAdapter(client);

    const result = await adapter.getCurrentIdentity();

    expect(result).toEqual({
      ok: true,
      identity: { userId: "guest-a", isAnonymous: true },
    });
    expect(JSON.stringify(result)).not.toContain("access-token-that-must-never-leave-the-adapter");
    expect(JSON.stringify(result)).not.toContain("refresh-token-that-must-never-leave-the-adapter");
  });

  it("maps permanent users and an absent session without exposing provider data", async () => {
    const { auth, client } = createClient();
    auth.getSession = jest
      .fn()
      .mockResolvedValueOnce({
        data: { session: session("member-a", false) },
        error: null,
      })
      .mockResolvedValueOnce({ data: { session: null }, error: null });
    const adapter = createSupabaseAuthAdapter(client);

    await expect(adapter.getCurrentIdentity()).resolves.toEqual({
      ok: true,
      identity: { userId: "member-a", isAnonymous: false },
    });
    await expect(adapter.getCurrentIdentity()).resolves.toEqual({
      ok: true,
      identity: null,
    });
  });

  it("maps retryable and status-zero anonymous sign-in failures to network", async () => {
    const { auth, client } = createClient();
    auth.signInAnonymously = jest
      .fn()
      .mockResolvedValueOnce({
        data: { session: null },
        error: new AuthRetryableFetchError("temporary failure", 503),
      })
      .mockResolvedValueOnce({
        data: { session: null },
        error: new AuthError("offline", 0),
      });
    const adapter = createSupabaseAuthAdapter(client);

    await expect(adapter.signInAnonymously()).resolves.toEqual({
      ok: false,
      kind: "network",
    });
    await expect(adapter.signInAnonymously()).resolves.toEqual({
      ok: false,
      kind: "network",
    });
  });

  it.each([
    "bad_jwt",
    "session_not_found",
    "refresh_token_not_found",
    "refresh_token_already_used",
  ])("maps %s to invalid_session", async (code) => {
    const { auth, client } = createClient();
    auth.getSession = jest.fn().mockResolvedValue({
      data: { session: null },
      error: new AuthError("provider detail", 401, code),
    });

    await expect(
      createSupabaseAuthAdapter(client).getCurrentIdentity(),
    ).resolves.toEqual({ ok: false, kind: "invalid_session" });
  });

  it("maps storage exceptions and all other Auth failures to stable kinds", async () => {
    const { auth, client } = createClient();
    auth.getSession = jest
      .fn()
      .mockRejectedValueOnce(
        new SessionStorageError("SESSION_STORAGE_UNAVAILABLE"),
      )
      .mockRejectedValueOnce(new AuthError("provider detail", 500, "unknown"));
    const adapter = createSupabaseAuthAdapter(client);

    await expect(adapter.getCurrentIdentity()).resolves.toEqual({
      ok: false,
      kind: "storage",
    });
    await expect(adapter.getCurrentIdentity()).resolves.toEqual({
      ok: false,
      kind: "auth",
    });
  });

  it("returns a token-free anonymous sign-in identity", async () => {
    const { auth, client } = createClient();
    auth.signInAnonymously = jest.fn().mockResolvedValue({
      data: { session: session("guest-b", true) },
      error: null,
    });

    const result = await createSupabaseAuthAdapter(client).signInAnonymously();

    expect(result).toEqual({
      ok: true,
      identity: { userId: "guest-b", isAnonymous: true },
    });
    expect(JSON.stringify(result)).not.toContain("access-token-that-must-never-leave-the-adapter");
  });

  it("signs out locally and never returns a provider error", async () => {
    const { auth, client } = createClient();
    auth.signOut = jest
      .fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({
        error: new AuthError("provider detail", 500, "unknown"),
      });
    const adapter = createSupabaseAuthAdapter(client);

    await expect(adapter.signOutLocal()).resolves.toEqual({ ok: true });
    await expect(adapter.signOutLocal()).resolves.toEqual({
      ok: false,
      kind: "auth",
    });
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
