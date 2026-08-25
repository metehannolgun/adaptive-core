import {
  AuthRetryableFetchError,
  type SupabaseClient,
} from "@supabase/supabase-js";

import { SessionStorageError } from "./secure-session-storage";
import type { Database } from "../database/database.types";

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

type SupabaseAuthClient = Pick<SupabaseClient<Database>, "auth">;

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
    return { ok: false, kind: "storage" };
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

function identityFromSession(
  session: Awaited<ReturnType<SupabaseAuthClient["auth"]["getSession"]>>["data"]["session"],
): AuthIdentity | null {
  if (session === null) {
    return null;
  }

  return {
    userId: session.user.id,
    isAnonymous: session.user.is_anonymous === true,
  };
}

export function createSupabaseAuthAdapter(
  client: SupabaseAuthClient,
): IdentityAuthPort {
  return {
    async getCurrentIdentity() {
      try {
        const { data, error } = await client.auth.getSession();
        if (error !== null) {
          return mapAuthFailure(error);
        }

        return { ok: true, identity: identityFromSession(data.session) };
      } catch (error) {
        return mapAuthFailure(error);
      }
    },

    async signInAnonymously() {
      try {
        const { data, error } = await client.auth.signInAnonymously();
        if (error !== null) {
          return mapAuthFailure(error);
        }

        return { ok: true, identity: identityFromSession(data.session) };
      } catch (error) {
        return mapAuthFailure(error);
      }
    },

    async signOutLocal() {
      try {
        const { error } = await client.auth.signOut({ scope: "local" });
        return error === null ? { ok: true } : { ok: false, kind: "auth" };
      } catch {
        return { ok: false, kind: "auth" };
      }
    },
  };
}
