import "react-native-url-polyfill/auto";

import {
  createClient,
  processLock,
  type SupabaseClient,
} from "@supabase/supabase-js";
import { AppState, type AppStateStatus } from "react-native";

import type { SupabaseSessionStorage } from "../auth/secure-session-storage";
import type { PublicEnv } from "../config/public-env";
import type { Database } from "./database.types";

export type ManagedSupabaseClient = {
  client: SupabaseClient<Database>;
  dispose(): void;
};

type AppStatePort = Pick<typeof AppState, "currentState" | "addEventListener">;

export type ManagedSupabaseClientDependencies = {
  createClient?: typeof createClient;
  appState?: AppStatePort;
};

function settleRefresh(operation: () => void | Promise<void>) {
  // Refresh failures are translated by the Auth adapter; this lifecycle bridge
  // must not log or expose session details while the app is backgrounded.
  try {
    void Promise.resolve(operation()).catch(() => undefined);
  } catch {
    // The lifecycle handler is intentionally fail-closed: startup continues
    // and the later Auth call reports a stable, token-free failure kind.
  }
}

export function createManagedSupabaseClient(
  config: PublicEnv,
  storage: SupabaseSessionStorage,
  dependencies: ManagedSupabaseClientDependencies = {},
): ManagedSupabaseClient {
  const createSupabaseClient = dependencies.createClient ?? createClient;
  const appState = dependencies.appState ?? AppState;
  const client = createSupabaseClient<Database>(
    config.supabaseUrl,
    config.supabasePublishableKey,
    {
      auth: {
        storage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock,
      },
    },
  );
  let disposed = false;

  function refreshFor(state: AppStateStatus) {
    if (state === "active") {
      settleRefresh(() => client.auth.startAutoRefresh());
      return;
    }

    settleRefresh(() => client.auth.stopAutoRefresh());
  }

  const subscription = appState.addEventListener("change", (nextState) => {
    if (!disposed) {
      refreshFor(nextState);
    }
  });

  refreshFor(appState.currentState);

  return {
    client,
    dispose() {
      if (disposed) {
        return;
      }

      disposed = true;
      subscription.remove();
      settleRefresh(() => client.auth.stopAutoRefresh());
    },
  };
}
