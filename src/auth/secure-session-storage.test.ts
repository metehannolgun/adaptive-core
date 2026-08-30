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

function createDeferred() {
  let resolve: (() => void) | undefined;
  const promise = new Promise<void>((complete) => {
    resolve = complete;
  });

  return {
    promise,
    resolve: () => resolve?.(),
  };
}

async function flushMicrotasks() {
  for (let index = 0; index < 10; index += 1) {
    await Promise.resolve();
  }
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

  it("invalidates a malformed manifest without trusting its contents", async () => {
    const { backend, values } = createMemoryBackend();
    values.set("adaptive_core.sb-project-auth-token.manifest", "secret-value");
    values.set("adaptive_core.sb-project-auth-token.chunk.1.0", "stale-one");
    values.set("adaptive_core.sb-project-auth-token.chunk.2.0", "stale-two");
    const storage = createSecureSessionStorage(backend);

    await expect(
      storage.removeItem("sb-project-auth-token"),
    ).resolves.toBeUndefined();

    expect(values.size).toBe(0);
    await expect(storage.getItem("sb-project-auth-token")).resolves.toBeNull();
  });

  it("waits for an in-progress write before reading the committed generation", async () => {
    const { backend, values } = createMemoryBackend();
    const storage = createSecureSessionStorage(backend);
    const firstValue = "first-session";
    const secondValue = "second-session";

    await storage.setItem("sb-project-auth-token", firstValue);

    const secondGenerationWrite = createDeferred();
    const secondGenerationStarted = createDeferred();
    backend.setItemAsync = jest.fn(async (key, value, options) => {
      if (key === "adaptive_core.sb-project-auth-token.chunk.2.0") {
        secondGenerationStarted.resolve();
        await secondGenerationWrite.promise;
      }
      values.set(key, value);
    });

    const pendingWrite = storage.setItem("sb-project-auth-token", secondValue);
    await secondGenerationStarted.promise;

    let readSettled = false;
    const pendingRead = storage.getItem("sb-project-auth-token").then((value) => {
      readSettled = true;
      return value;
    });
    await flushMicrotasks();

    expect(readSettled).toBe(false);

    secondGenerationWrite.resolve();
    await pendingWrite;

    await expect(pendingRead).resolves.toBe(secondValue);
  });

  it("serializes a paused read ahead of two generation-reusing writes", async () => {
    const { backend, values } = createMemoryBackend();
    const storage = createSecureSessionStorage(backend);
    const firstValue = "a".repeat(2_000);
    const secondValue = "b".repeat(2_000);
    const thirdValue = "c".repeat(2_000);

    await storage.setItem("sb-project-auth-token", firstValue);

    const chunkReadStarted = createDeferred();
    const finishChunkRead = createDeferred();
    let shouldPauseChunkRead = true;
    backend.getItemAsync = jest.fn(async (key) => {
      if (
        shouldPauseChunkRead &&
        key === "adaptive_core.sb-project-auth-token.chunk.1.0"
      ) {
        shouldPauseChunkRead = false;
        chunkReadStarted.resolve();
        await finishChunkRead.promise;
      }

      return values.get(key) ?? null;
    });
    (backend.deleteItemAsync as jest.Mock).mockClear();

    const pendingRead = storage.getItem("sb-project-auth-token");
    await chunkReadStarted.promise;

    const secondWrite = storage.setItem("sb-project-auth-token", secondValue);
    const thirdWrite = storage.setItem("sb-project-auth-token", thirdValue);
    await flushMicrotasks();

    // Reads and writes share one per-key queue, so neither write can recycle
    // generation 1 while this reader still holds its chunks.
    expect(backend.deleteItemAsync).not.toHaveBeenCalled();

    finishChunkRead.resolve();
    await expect(pendingRead).resolves.toBe(firstValue);
    await secondWrite;
    await thirdWrite;
    await expect(storage.getItem("sb-project-auth-token")).resolves.toBe(
      thirdValue,
    );
  });

  it("serializes removal after an in-progress read", async () => {
    const { backend, values } = createMemoryBackend();
    const storage = createSecureSessionStorage(backend);

    await storage.setItem("sb-project-auth-token", "existing-session");

    const chunkReadStarted = createDeferred();
    const finishChunkRead = createDeferred();
    backend.getItemAsync = jest.fn(async (key) => {
      const value = values.get(key) ?? null;
      if (key === "adaptive_core.sb-project-auth-token.chunk.1.0") {
        chunkReadStarted.resolve();
        await finishChunkRead.promise;
      }
      return value;
    });

    const pendingRead = storage.getItem("sb-project-auth-token");
    await chunkReadStarted.promise;
    const pendingRemoval = storage.removeItem("sb-project-auth-token");
    await flushMicrotasks();

    expect(
      values.has("adaptive_core.sb-project-auth-token.manifest"),
    ).toBe(true);

    finishChunkRead.resolve();

    await expect(pendingRead).resolves.toBe("existing-session");
    await pendingRemoval;
    await expect(storage.getItem("sb-project-auth-token")).resolves.toBeNull();
  });

  it("removes failed candidate-generation chunks before logout", async () => {
    const { backend, values } = createMemoryBackend();
    const storage = createSecureSessionStorage(backend);

    await storage.setItem("sb-project-auth-token", "first-session");

    backend.setItemAsync = jest.fn(async (key, value) => {
      if (key === "adaptive_core.sb-project-auth-token.chunk.2.1") {
        throw new Error("raw-secret");
      }

      values.set(key, value);
    });

    await expect(
      storage.setItem("sb-project-auth-token", "x".repeat(2_000)),
    ).rejects.toEqual(new SessionStorageError("SESSION_STORAGE_UNAVAILABLE"));

    await storage.removeItem("sb-project-auth-token");

    expect(
      [...values.keys()].some((key) => key.includes(".chunk.2.")),
    ).toBe(false);
    expect(values.size).toBe(0);
  });

  it("cleans unpublished chunks when manifest publication fails", async () => {
    const { backend, values } = createMemoryBackend();
    const storage = createSecureSessionStorage(backend);
    const firstValue = "first-session";

    await storage.setItem("sb-project-auth-token", firstValue);

    backend.setItemAsync = jest.fn(async (key, value) => {
      if (key === "adaptive_core.sb-project-auth-token.manifest") {
        throw new Error("raw-secret");
      }

      values.set(key, value);
    });

    await expect(
      storage.setItem("sb-project-auth-token", "x".repeat(2_000)),
    ).rejects.toEqual(new SessionStorageError("SESSION_STORAGE_UNAVAILABLE"));

    expect(await storage.getItem("sb-project-auth-token")).toBe(firstValue);

    await storage.removeItem("sb-project-auth-token");

    expect(
      [...values.keys()].some((key) => key.includes(".chunk.2.")),
    ).toBe(false);
    expect(values.size).toBe(0);
  });

  it("reports a published write as committed when stale cleanup fails", async () => {
    const { backend, values } = createMemoryBackend();
    const storage = createSecureSessionStorage(backend);

    await storage.setItem("sb-project-auth-token", "first-session");

    let failStaleCleanup = true;
    backend.deleteItemAsync = jest.fn(async (key) => {
      if (
        failStaleCleanup &&
        key.startsWith("adaptive_core.sb-project-auth-token.chunk.1.")
      ) {
        throw new Error("raw-secret");
      }
      values.delete(key);
    });

    await expect(
      storage.setItem("sb-project-auth-token", "second-session"),
    ).resolves.toBeUndefined();
    await expect(storage.getItem("sb-project-auth-token")).resolves.toBe(
      "second-session",
    );

    failStaleCleanup = false;
    await storage.removeItem("sb-project-auth-token");
    expect(values.size).toBe(0);
  });

  it("reuses two bounded generation slots and clears stale fragments before reuse", async () => {
    const { backend, values } = createMemoryBackend();
    const storage = createSecureSessionStorage(backend);

    await storage.setItem("sb-project-auth-token", "x".repeat(2_000));

    let failStaleCleanup = true;
    backend.deleteItemAsync = jest.fn(async (key) => {
      if (
        failStaleCleanup &&
        key.startsWith("adaptive_core.sb-project-auth-token.chunk.1.")
      ) {
        throw new Error("raw-secret");
      }
      values.delete(key);
    });

    await storage.setItem("sb-project-auth-token", "second-session");
    expect(
      values.has("adaptive_core.sb-project-auth-token.chunk.1.1"),
    ).toBe(true);

    failStaleCleanup = false;
    await storage.setItem("sb-project-auth-token", "third-session");

    expect(
      values.has("adaptive_core.sb-project-auth-token.chunk.1.1"),
    ).toBe(false);
    expect(
      [...values.keys()]
        .filter((key) => key.includes(".chunk."))
        .every((key) => /\.chunk\.(1|2)\./.test(key)),
    ).toBe(true);
    await expect(storage.getItem("sb-project-auth-token")).resolves.toBe(
      "third-session",
    );
  });

  it("hides native failures behind a stable storage error", async () => {
    const { backend } = createMemoryBackend();
    backend.getItemAsync = jest.fn(async () => {
      throw new Error("raw-secret");
    });
    const storage = createSecureSessionStorage(backend);

    const failure = await storage
      .getItem("sb-project-auth-token")
      .catch((error: unknown) => error);

    expect(failure).toEqual(
      new SessionStorageError("SESSION_STORAGE_UNAVAILABLE"),
    );
    expect(JSON.stringify(failure)).not.toContain("raw-secret");
  });
});
