import type {
  AuthPortResult,
  IdentityAuthPort,
} from "./supabase-auth-adapter";
import {
  createIdentityService,
  type IdentityState,
} from "./identity-service";
import {
  createSecureSessionStorage,
  type SecureStoreBackend,
} from "./secure-session-storage";

function createAuthPort(): jest.Mocked<IdentityAuthPort> {
  return {
    getCurrentIdentity: jest.fn(),
    signInAnonymously: jest.fn(),
    signOutLocal: jest.fn(),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });

  return { promise, resolve };
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

  it("clears corrupt local storage before confirming that no session exists", async () => {
    const auth = createAuthPort();
    auth.getCurrentIdentity.mockResolvedValue({
      ok: false,
      kind: "corrupt_storage",
    });
    auth.signOutLocal.mockResolvedValue({ ok: true });
    const service = createIdentityService(auth);

    await expect(service.restore()).resolves.toEqual({ status: "no_session" });
    expect(auth.signOutLocal).toHaveBeenCalledTimes(1);
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

  it("restores after an unverified sign-in result before creating another guest", async () => {
    const auth = createAuthPort();
    auth.getCurrentIdentity
      .mockResolvedValueOnce({ ok: true, identity: null })
      .mockResolvedValueOnce({
        ok: true,
        identity: { userId: "guest-created-on-server", isAnonymous: true },
      });
    auth.signInAnonymously.mockResolvedValue({ ok: false, kind: "network" });
    const service = createIdentityService(auth);

    await service.restore();
    await expect(service.ensureGuestSession()).resolves.toEqual({
      status: "offline",
    });
    await expect(service.ensureGuestSession()).resolves.toEqual({
      status: "guest",
      userId: "guest-created-on-server",
    });

    expect(auth.getCurrentIdentity).toHaveBeenCalledTimes(2);
    expect(auth.signInAnonymously).toHaveBeenCalledTimes(1);
  });

  it.each([
    {
      identity: { userId: "guest-recovered", isAnonymous: true },
      expected: { status: "guest", userId: "guest-recovered" },
    },
    {
      identity: { userId: "member-recovered", isAnonymous: false },
      expected: { status: "permanent", userId: "member-recovered" },
    },
  ] as const)(
    "retries an offline restore before deciding whether $expected.status needs a guest",
    async ({ identity, expected }) => {
      const auth = createAuthPort();
      auth.getCurrentIdentity
        .mockResolvedValueOnce({ ok: false, kind: "network" })
        .mockResolvedValueOnce({ ok: true, identity });
      const service = createIdentityService(auth);

      await expect(service.restore()).resolves.toEqual({ status: "offline" });
      await expect(service.ensureGuestSession()).resolves.toEqual(expected);

      expect(auth.getCurrentIdentity).toHaveBeenCalledTimes(2);
      expect(auth.signInAnonymously).not.toHaveBeenCalled();
    },
  );

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
    auth.getCurrentIdentity.mockResolvedValue({ ok: true, identity: null });
    let resolveSignIn!: (value: Awaited<ReturnType<IdentityAuthPort["signInAnonymously"]>>) => void;
    auth.signInAnonymously.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSignIn = resolve;
        }),
    );
    const service = createIdentityService(auth);
    await service.restore();

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

  it.each([
    {
      identity: { userId: "guest-restored", isAnonymous: true },
      expected: { status: "guest", userId: "guest-restored" },
    },
    {
      identity: { userId: "member-restored", isAnonymous: false },
      expected: { status: "permanent", userId: "member-restored" },
    },
  ] as const)(
    "waits for an in-flight restore before deciding whether %s needs a guest",
    async ({ identity, expected }) => {
      const auth = createAuthPort();
      const restoreResult = deferred<AuthPortResult>();
      const anonymousResult = deferred<AuthPortResult>();
      auth.getCurrentIdentity.mockReturnValue(restoreResult.promise);
      auth.signInAnonymously.mockReturnValue(anonymousResult.promise);
      const service = createIdentityService(auth);

      const restore = service.restore();
      const guest = service.ensureGuestSession();

      expect(auth.signInAnonymously).not.toHaveBeenCalled();

      restoreResult.resolve({ ok: true, identity });

      await expect(Promise.all([restore, guest])).resolves.toEqual([
        expected,
        expected,
      ]);
      expect(auth.signInAnonymously).not.toHaveBeenCalled();
    },
  );

  it.each([
    {
      identity: { userId: "guest-listener-race", isAnonymous: true },
      expected: { status: "guest", userId: "guest-listener-race" },
    },
    {
      identity: { userId: "member-listener-race", isAnonymous: false },
      expected: { status: "permanent", userId: "member-listener-race" },
    },
  ] as const)(
    "waits when a restoring listener asks for a guest before %s is resolved",
    async ({ identity, expected }) => {
      const auth = createAuthPort();
      const restoreResult = deferred<AuthPortResult>();
      const anonymousResult = deferred<AuthPortResult>();
      auth.getCurrentIdentity.mockReturnValue(restoreResult.promise);
      auth.signInAnonymously.mockReturnValue(anonymousResult.promise);
      const service = createIdentityService(auth);
      let guestRequest!: Promise<IdentityState>;

      service.subscribe((state) => {
        if (state.status === "restoring") {
          guestRequest = service.ensureGuestSession();
        }
      });

      const restore = service.restore();
      await Promise.resolve();

      expect(auth.signInAnonymously).not.toHaveBeenCalled();

      restoreResult.resolve({ ok: true, identity });

      await expect(Promise.all([restore, guestRequest])).resolves.toEqual([
        expected,
        expected,
      ]);
      expect(auth.signInAnonymously).not.toHaveBeenCalled();
    },
  );

  it("contains a rejected identity lookup in a stable error state", async () => {
    const auth = createAuthPort();
    auth.getCurrentIdentity.mockRejectedValue(
      new Error("provider detail with access token"),
    );
    const service = createIdentityService(auth);

    await expect(service.restore()).resolves.toEqual({
      status: "error",
      code: "AUTH_UNAVAILABLE",
    });
    expect(JSON.stringify(service.getState())).not.toContain("access token");
  });

  it("contains a rejected invalid-session cleanup in a stable error state", async () => {
    const auth = createAuthPort();
    auth.getCurrentIdentity.mockResolvedValue({
      ok: false,
      kind: "invalid_session",
    });
    auth.signOutLocal.mockRejectedValue(
      new Error("provider detail with refresh token"),
    );

    await expect(createIdentityService(auth).restore()).resolves.toEqual({
      status: "error",
      code: "AUTH_UNAVAILABLE",
    });
  });

  it("contains a rejected anonymous sign-in and clears its retry handle", async () => {
    const auth = createAuthPort();
    auth.getCurrentIdentity.mockResolvedValue({ ok: true, identity: null });
    auth.signInAnonymously
      .mockRejectedValueOnce(new Error("provider detail with access token"))
      .mockResolvedValueOnce({
        ok: true,
        identity: { userId: "guest-after-rejection", isAnonymous: true },
      });
    const service = createIdentityService(auth);
    await service.restore();

    await expect(service.ensureGuestSession()).resolves.toEqual({
      status: "error",
      code: "AUTH_UNAVAILABLE",
    });
    await expect(service.ensureGuestSession()).resolves.toEqual({
      status: "guest",
      userId: "guest-after-rejection",
    });
    expect(auth.signInAnonymously).toHaveBeenCalledTimes(2);
  });

  it("contains a malformed anonymous sign-in return without throwing", async () => {
    const auth = createAuthPort();
    auth.getCurrentIdentity.mockResolvedValue({ ok: true, identity: null });
    auth.signInAnonymously.mockImplementation(
      () => undefined as unknown as Promise<AuthPortResult>,
    );
    const service = createIdentityService(auth);
    await service.restore();
    let request!: Promise<IdentityState>;

    expect(() => {
      request = service.ensureGuestSession();
    }).not.toThrow();
    await expect(request).resolves.toEqual({
      status: "error",
      code: "AUTH_UNAVAILABLE",
    });
  });

  it("maps a non-network anonymous Auth failure to a stable error", async () => {
    const auth = createAuthPort();
    auth.getCurrentIdentity.mockResolvedValue({ ok: true, identity: null });
    auth.signInAnonymously.mockResolvedValue({ ok: false, kind: "auth" });

    const service = createIdentityService(auth);
    await service.restore();

    await expect(service.ensureGuestSession()).resolves.toEqual({
      status: "error",
      code: "AUTH_UNAVAILABLE",
    });
  });

  it("does not retry anonymous signup after its session commit succeeds", async () => {
    const values = new Map<string, string>();
    let failStaleCleanup = false;
    const backend: SecureStoreBackend = {
      getItemAsync: jest.fn(async (key) => values.get(key) ?? null),
      setItemAsync: jest.fn(async (key, value) => {
        values.set(key, value);
      }),
      deleteItemAsync: jest.fn(async (key) => {
        if (
          failStaleCleanup &&
          key.startsWith("adaptive_core.adaptive-core-auth.chunk.1.")
        ) {
          throw new Error("raw-secret");
        }
        values.delete(key);
      }),
    };
    const storage = createSecureSessionStorage(backend);
    await storage.setItem("adaptive-core-auth", "previous-session");
    failStaleCleanup = true;

    const auth = createAuthPort();
    auth.getCurrentIdentity.mockResolvedValue({ ok: true, identity: null });
    auth.signInAnonymously.mockImplementation(async () => {
      await storage.setItem("adaptive-core-auth", "new-guest-session");
      return {
        ok: true,
        identity: { userId: "guest-committed", isAnonymous: true },
      };
    });
    const service = createIdentityService(auth);

    await service.restore();
    await expect(service.ensureGuestSession()).resolves.toEqual({
      status: "guest",
      userId: "guest-committed",
    });
    await expect(service.ensureGuestSession()).resolves.toEqual({
      status: "guest",
      userId: "guest-committed",
    });
    expect(auth.signInAnonymously).toHaveBeenCalledTimes(1);
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
