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
      "version" in parsed &&
      parsed.version === 1 &&
      "generation" in parsed &&
      typeof parsed.generation === "number" &&
      Number.isSafeInteger(parsed.generation) &&
      "chunks" in parsed &&
      typeof parsed.chunks === "number" &&
      Number.isInteger(parsed.chunks) &&
      parsed.chunks >= 0 &&
      parsed.chunks <= MAX_CHUNKS
    ) {
      return parsed as Manifest;
    }
  } catch {
    // The stable error below intentionally excludes the stored value.
  }

  throw new SessionStorageError("CORRUPT_SESSION_STORAGE");
}

function chunkKey(base: string, generation: number, index: number) {
  return `${base}.chunk.${generation}.${index}`;
}

function manifestKey(base: string) {
  return `${base}.manifest`;
}

function asStorageError(error: unknown): SessionStorageError {
  if (error instanceof SessionStorageError) {
    return error;
  }

  return new SessionStorageError("SESSION_STORAGE_UNAVAILABLE");
}

export function createSecureSessionStorage(
  backend: SecureStoreBackend = SecureStore,
): SupabaseSessionStorage {
  const writeOperations = new Map<string, Promise<void>>();

  async function readManifest(base: string): Promise<Manifest | null> {
    return parseManifest(
      await backend.getItemAsync(manifestKey(base), secureStoreOptions),
    );
  }

  async function deleteGeneration(base: string, generation: number) {
    await Promise.all(
      Array.from({ length: MAX_CHUNKS }, (_, index) =>
        backend.deleteItemAsync(
          chunkKey(base, generation, index),
          secureStoreOptions,
        ),
      ),
    );
  }

  function enqueueWrite(
    key: string,
    operation: () => Promise<void>,
  ): Promise<void> {
    const previous = writeOperations.get(key) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(operation);

    writeOperations.set(key, next);
    void next.then(
      () => {
        if (writeOperations.get(key) === next) {
          writeOperations.delete(key);
        }
      },
      () => {
        if (writeOperations.get(key) === next) {
          writeOperations.delete(key);
        }
      },
    );

    return next;
  }

  return {
    async getItem(key) {
      const base = baseKey(key);

      try {
        const manifest = await readManifest(base);
        if (manifest === null) {
          return null;
        }

        const chunks = await Promise.all(
          Array.from({ length: manifest.chunks }, async (_, index) => {
            const chunk = await backend.getItemAsync(
              chunkKey(base, manifest.generation, index),
              secureStoreOptions,
            );
            if (chunk === null) {
              throw new SessionStorageError("CORRUPT_SESSION_STORAGE");
            }
            return chunk;
          }),
        );

        return chunks.join("");
      } catch (error) {
        throw asStorageError(error);
      }
    },

    async setItem(key, value) {
      const base = baseKey(key);
      const chunks = splitValue(value);

      return enqueueWrite(key, async () => {
        try {
          const activeManifest = await readManifest(base);
          const generation = (activeManifest?.generation ?? 0) + 1;

          await Promise.all(
            chunks.map((chunk, index) =>
              backend.setItemAsync(
                chunkKey(base, generation, index),
                chunk,
                secureStoreOptions,
              ),
            ),
          );

          await backend.setItemAsync(
            manifestKey(base),
            JSON.stringify({ version: 1, generation, chunks: chunks.length }),
            secureStoreOptions,
          );

          if (activeManifest !== null) {
            await deleteGeneration(base, activeManifest.generation);
          }
        } catch (error) {
          throw asStorageError(error);
        }
      });
    },

    async removeItem(key) {
      const base = baseKey(key);

      return enqueueWrite(key, async () => {
        try {
          const activeManifest = await readManifest(base);

          await backend.deleteItemAsync(manifestKey(base), secureStoreOptions);

          if (activeManifest !== null) {
            await deleteGeneration(base, activeManifest.generation);
            await deleteGeneration(base, activeManifest.generation - 1);
          }
        } catch (error) {
          throw asStorageError(error);
        }
      });
    },
  };
}
