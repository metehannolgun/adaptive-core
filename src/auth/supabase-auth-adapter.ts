import {
  AuthRetryableFetchError,
  type SupabaseClient,
} from "@supabase/supabase-js";

import {
  SessionStorageError,
  type SupabaseSessionStorage,
} from "./secure-session-storage";
import type { Database } from "../database/database.types";

export type AuthIdentity = {
  userId: string;
  isAnonymous: boolean;
};

export type AuthPortFailureKind =
  | "network"
  | "invalid_session"
  | "corrupt_storage"
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

type SupabaseAuthClient = Pick<
  SupabaseClient<Database>["auth"],
  "getClaims" | "signInAnonymously" | "signOut"
>;

const invalidSessionCodes = new Set([
  "bad_jwt",
  "session_not_found",
  "refresh_token_not_found",
  "refresh_token_already_used",
]);

function readErrorField(error: unknown, field: "code" | "status") {
  if (typeof error !== "object" || error === null || !(field in error)) {
    return undefined;
  }

  return (error as Record<string, unknown>)[field];
}

function mapAuthFailure(error: unknown): AuthPortResult {
  if (error instanceof SessionStorageError) {
    return error.code === "CORRUPT_SESSION_STORAGE"
      ? { ok: false, kind: "corrupt_storage" }
      : { ok: false, kind: "storage" };
  }

  if (
    error instanceof AuthRetryableFetchError ||
    readErrorField(error, "status") === 0
  ) {
    return { ok: false, kind: "network" };
  }

  const code = readErrorField(error, "code");
  if (typeof code === "string" && invalidSessionCodes.has(code)) {
    return { ok: false, kind: "invalid_session" };
  }

  return { ok: false, kind: "auth" };
}

function identityFromVerifiedClaims(data: unknown): AuthPortResult {
  if (data === null) {
    return { ok: true, identity: null };
  }

  if (
    typeof data !== "object" ||
    !("claims" in data) ||
    typeof data.claims !== "object" ||
    data.claims === null ||
    !("sub" in data.claims) ||
    typeof data.claims.sub !== "string" ||
    data.claims.sub.length === 0
  ) {
    return { ok: false, kind: "auth" };
  }

  return {
    ok: true,
    identity: {
      userId: data.claims.sub,
      isAnonymous:
        "is_anonymous" in data.claims && data.claims.is_anonymous === true,
    },
  };
}

export function createSupabaseAuthAdapter(
  client: { auth: SupabaseAuthClient },
  sessionStorage: SupabaseSessionStorage,
  authStorageKey: string,
): IdentityAuthPort {
  let corruptStorageObserved = false;

  function rememberStorageCorruption(result: AuthPortResult) {
    if (!result.ok && result.kind === "corrupt_storage") {
      corruptStorageObserved = true;
    }
    return result;
  }

  async function getVerifiedIdentity(
    jwt?: string,
    identityRequired = false,
  ): Promise<AuthPortResult> {
    try {
      const { data, error } = await client.auth.getClaims(jwt);
      if (error !== null) {
        return rememberStorageCorruption(mapAuthFailure(error));
      }

      const result = identityFromVerifiedClaims(data);
      if (identityRequired && result.ok && result.identity === null) {
        return { ok: false, kind: "auth" };
      }
      return result;
    } catch (error) {
      return rememberStorageCorruption(mapAuthFailure(error));
    }
  }

  return {
    getCurrentIdentity() {
      // getClaims verifies the JWT signature (or asks Auth to verify it) before
      // any identity reaches application state; stored session.user is untrusted.
      return getVerifiedIdentity();
    },

    async signInAnonymously() {
      try {
        const { data, error } = await client.auth.signInAnonymously();
        if (error !== null) {
          return mapAuthFailure(error);
        }

        const accessToken = data.session?.access_token;
        if (typeof accessToken !== "string" || accessToken.length === 0) {
          return { ok: false, kind: "auth" };
        }

        return await getVerifiedIdentity(accessToken, true);
      } catch (error) {
        return mapAuthFailure(error);
      }
    },

    async signOutLocal() {
      if (corruptStorageObserved) {
        try {
          // Supabase signOut reads the current session first. Directly remove
          // the known storage slot when that read itself is what is corrupt.
          await sessionStorage.removeItem(authStorageKey);
          corruptStorageObserved = false;
          return { ok: true };
        } catch {
          return { ok: false, kind: "auth" };
        }
      }

      try {
        const { error } = await client.auth.signOut({ scope: "local" });
        return error === null ? { ok: true } : { ok: false, kind: "auth" };
      } catch {
        return { ok: false, kind: "auth" };
      }
    },
  };
}
