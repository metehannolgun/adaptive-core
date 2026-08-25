import type {
  AuthIdentity,
  AuthPortResult,
  IdentityAuthPort,
} from "./supabase-auth-adapter";

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

function identityToState(identity: AuthIdentity): IdentityState {
  return identity.isAnonymous
    ? { status: "guest", userId: identity.userId }
    : { status: "permanent", userId: identity.userId };
}

function resultToState(result: AuthPortResult): IdentityState {
  if (result.ok) {
    return result.identity === null
      ? { status: "no_session" }
      : identityToState(result.identity);
  }

  switch (result.kind) {
    case "network":
      return { status: "offline" };
    case "storage":
      return { status: "error", code: "SESSION_STORAGE_UNAVAILABLE" };
    default:
      return { status: "error", code: "AUTH_UNAVAILABLE" };
  }
}

export function createIdentityService(auth: IdentityAuthPort): IdentityService {
  let state: IdentityState = { status: "restoring" };
  const listeners = new Set<(next: IdentityState) => void>();
  let restoreRequest: Promise<IdentityState> | null = null;
  let guestRequest: Promise<IdentityState> | null = null;

  function publish(next: IdentityState): IdentityState {
    state = next;
    // Listeners may unsubscribe while handling an update, so notify a snapshot.
    for (const listener of [...listeners]) {
      listener(next);
    }

    return next;
  }

  function unavailable(): IdentityState {
    return publish({ status: "error", code: "AUTH_UNAVAILABLE" });
  }

  function restore() {
    if (restoreRequest !== null) {
      return restoreRequest;
    }

    publish({ status: "restoring" });

    let request!: Promise<IdentityState>;
    request = Promise.resolve()
      .then(() => auth.getCurrentIdentity())
      .then((result) => {
        if (!result.ok && result.kind === "invalid_session") {
          return Promise.resolve()
            .then(() => auth.signOutLocal())
            .then((signOut) =>
              publish(
                signOut.ok
                  ? { status: "no_session" }
                  : { status: "error", code: "AUTH_UNAVAILABLE" },
              ),
            );
        }

        return publish(resultToState(result));
      })
      .catch(unavailable)
      .finally(() => {
        if (restoreRequest === request) {
          restoreRequest = null;
        }
      });

    restoreRequest = request;
    return request;
  }

  function ensureGuestSession(): Promise<IdentityState> {
    if (state.status === "guest" || state.status === "permanent") {
      return Promise.resolve(state);
    }

    if (restoreRequest !== null) {
      return restoreRequest.then((restoredState) =>
        restoredState.status === "guest" || restoredState.status === "permanent"
          ? restoredState
          : ensureGuestSession(),
      );
    }

    if (guestRequest !== null) {
      return guestRequest;
    }

    let request!: Promise<IdentityState>;
    let signInRequest: Promise<AuthPortResult>;
    try {
      signInRequest = auth.signInAnonymously();
    } catch {
      signInRequest = Promise.reject();
    }

    request = signInRequest
      .then((result) => publish(resultToState(result)))
      .catch(unavailable)
      .finally(() => {
        if (guestRequest === request) {
          guestRequest = null;
        }
      });

    guestRequest = request;
    return request;
  }

  return {
    restore,

    ensureGuestSession,

    getState() {
      return state;
    },

    subscribe(listener) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}
