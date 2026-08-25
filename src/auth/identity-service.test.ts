import type {
  AuthPortResult,
  IdentityAuthPort,
} from "./supabase-auth-adapter";
import {
  createIdentityService,
  type IdentityState,
} from "./identity-service";

function createAuthPort(): jest.Mocked<IdentityAuthPort> {
  return {
    getCurrentIdentity: jest.fn(),
    signInAnonymously: jest.fn(),
    signOutLocal: jest.fn(),
  };
}

describe("createIdentityService", () => {
  const restoreCases: Array<[string, AuthPortResult, IdentityState]> = [
    [
      "a valid anonymous session",
      { ok: true, identity: { userId: "guest-a", isAnonymous: true } },
      { status: "guest", userId: "guest-a" },
    ],
    [
      "a valid permanent session",
      { ok: true, identity: { userId: "member-a", isAnonymous: false } },
      { status: "permanent", userId: "member-a" },
    ],
    ["an absent session", { ok: true, identity: null }, { status: "no_session" }],
  ];

  it.each(restoreCases)("restores %s into the matching application state", async (_, result, state) => {
    const auth = createAuthPort();
    auth.getCurrentIdentity.mockResolvedValue(result);
    const service = createIdentityService(auth);

    await expect(service.restore()).resolves.toEqual(state);
    expect(service.getState()).toEqual(state);
  });

  const restoreFailureCases: Array<[string, AuthPortResult, IdentityState]> = [
    ["network", { ok: false, kind: "network" }, { status: "offline" }],
    [
      "storage",
      { ok: false, kind: "storage" },
      { status: "error", code: "SESSION_STORAGE_UNAVAILABLE" },
    ],
  ];

  it.each(restoreFailureCases)("maps a %s restore failure without provider details", async (_, result, state) => {
    const auth = createAuthPort();
    auth.getCurrentIdentity.mockResolvedValue(result);

    await expect(createIdentityService(auth).restore()).resolves.toEqual(state);
  });

  it("clears an invalid local session before continuing unauthenticated", async () => {
    const auth = createAuthPort();
    auth.getCurrentIdentity.mockResolvedValue({
      ok: false,
      kind: "invalid_session",
    });
    auth.signOutLocal.mockResolvedValue({ ok: true });
    const service = createIdentityService(auth);

    await expect(service.restore()).resolves.toEqual({ status: "no_session" });
    expect(auth.signOutLocal).toHaveBeenCalledTimes(1);
  });

  it("reports a stable error when invalid-session cleanup fails", async () => {
    const auth = createAuthPort();
    auth.getCurrentIdentity.mockResolvedValue({
      ok: false,
      kind: "invalid_session",
    });
    auth.signOutLocal.mockResolvedValue({ ok: false, kind: "auth" });

    await expect(createIdentityService(auth).restore()).resolves.toEqual({
      status: "error",
      code: "AUTH_UNAVAILABLE",
    });
  });

  it("creates a guest from no session and retries successfully from offline", async () => {
    const auth = createAuthPort();
    auth.getCurrentIdentity.mockResolvedValue({ ok: true, identity: null });
    auth.signInAnonymously
      .mockResolvedValueOnce({ ok: false, kind: "network" })
      .mockResolvedValueOnce({
        ok: true,
        identity: { userId: "guest-retry", isAnonymous: true },
      });
    const service = createIdentityService(auth);

    await service.restore();
    await expect(service.ensureGuestSession()).resolves.toEqual({
      status: "offline",
    });
    await expect(service.ensureGuestSession()).resolves.toEqual({
      status: "guest",
      userId: "guest-retry",
    });
    expect(auth.signInAnonymously).toHaveBeenCalledTimes(2);
  });

  it.each([
    { status: "guest", userId: "guest-a" },
    { status: "permanent", userId: "member-a" },
  ] as const)("reuses an existing %s identity without another Auth call", async (state) => {
    const auth = createAuthPort();
    auth.getCurrentIdentity.mockResolvedValue({
      ok: true,
      identity: {
        userId: state.userId,
        isAnonymous: state.status === "guest",
      },
    });
    const service = createIdentityService(auth);

    await service.restore();
    await expect(service.ensureGuestSession()).resolves.toEqual(state);
    expect(auth.signInAnonymously).not.toHaveBeenCalled();
  });

  it("shares one anonymous Auth request between concurrent callers", async () => {
    const auth = createAuthPort();
    let resolveSignIn!: (value: Awaited<ReturnType<IdentityAuthPort["signInAnonymously"]>>) => void;
    auth.signInAnonymously.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSignIn = resolve;
        }),
    );
    const service = createIdentityService(auth);

    const first = service.ensureGuestSession();
    const second = service.ensureGuestSession();

    expect(auth.signInAnonymously).toHaveBeenCalledTimes(1);
    expect(first).toBe(second);

    resolveSignIn({
      ok: true,
      identity: { userId: "guest-once", isAnonymous: true },
    });

    await expect(Promise.all([first, second])).resolves.toEqual([
      { status: "guest", userId: "guest-once" },
      { status: "guest", userId: "guest-once" },
    ]);
  });

  it("maps a non-network anonymous Auth failure to a stable error", async () => {
    const auth = createAuthPort();
    auth.signInAnonymously.mockResolvedValue({ ok: false, kind: "auth" });

    await expect(createIdentityService(auth).ensureGuestSession()).resolves.toEqual({
      status: "error",
      code: "AUTH_UNAVAILABLE",
    });
  });

  it("notifies subscribers with state objects only and stops after unsubscribe", async () => {
    const auth = createAuthPort();
    auth.getCurrentIdentity.mockResolvedValue({ ok: true, identity: null });
    auth.signInAnonymously.mockResolvedValue({
      ok: true,
      identity: { userId: "guest-listener", isAnonymous: true },
    });
    const service = createIdentityService(auth);
    const listener = jest.fn();
    const unsubscribe = service.subscribe(listener);

    await service.restore();
    expect(listener).toHaveBeenLastCalledWith({ status: "no_session" });
    for (const [state] of listener.mock.calls) {
      expect(state).toEqual(expect.objectContaining({ status: expect.any(String) }));
      expect(JSON.stringify(state)).not.toMatch(/token|refresh|access/i);
    }

    unsubscribe();
    await service.ensureGuestSession();

    expect(listener).toHaveBeenCalledTimes(2);
  });
});
