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

  it("keeps the previous committed generation visible during a write", async () => {
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

    expect(await storage.getItem("sb-project-auth-token")).toBe(firstValue);

    secondGenerationWrite.resolve();
    await pendingWrite;

    expect(await storage.getItem("sb-project-auth-token")).toBe(secondValue);
  });

  it("retries the committed manifest when cleanup removes a generation being read", async () => {
    const { backend, values } = createMemoryBackend();
    const storage = createSecureSessionStorage(backend);
    const firstValue = "first-session";
    const secondValue = "second-session";

    await storage.setItem("sb-project-auth-token", firstValue);

    const oldChunkReadStarted = createDeferred();
    const finishOldChunkRead = createDeferred();
    let shouldPauseOldChunkRead = true;
    backend.getItemAsync = jest.fn(async (key) => {
      if (
        shouldPauseOldChunkRead &&
        key === "adaptive_core.sb-project-auth-token.chunk.1.0"
      ) {
        shouldPauseOldChunkRead = false;
        oldChunkReadStarted.resolve();
        await finishOldChunkRead.promise;
      }

      return values.get(key) ?? null;
    });

    const pendingRead = storage.getItem("sb-project-auth-token");
    await oldChunkReadStarted.promise;

    await storage.setItem("sb-project-auth-token", secondValue);
    finishOldChunkRead.resolve();

    await expect(pendingRead).resolves.toBe(secondValue);
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
