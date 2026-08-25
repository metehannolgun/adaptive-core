import { createSecureSessionStorage } from "./secure-session-storage";
import { createIdentityService, type IdentityService, type IdentityState } from "./identity-service";
import { createSupabaseAuthAdapter } from "./supabase-auth-adapter";
import { readPublicEnv } from "../config/public-env";
import { createManagedSupabaseClient } from "../database/supabase-client";

function createUnavailableIdentityService(): IdentityService {
  let state: IdentityState = { status: "restoring" };
  const listeners = new Set<(next: IdentityState) => void>();

  function publishUnavailableState() {
    state = { status: "error", code: "INVALID_PUBLIC_CONFIG" };
    for (const listener of [...listeners]) {
      listener(state);
    }

    return state;
  }

  return {
    async restore() {
      return publishUnavailableState();
    },

    async ensureGuestSession() {
      return publishUnavailableState();
    },

    getState() {
      return state;
    },

    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

function createDefaultIdentityService(): IdentityService {
  const config = readPublicEnv({
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  });
  if (!config.ok) {
    // Startup must still reach onboarding when a local build has no public Auth config.
    return createUnavailableIdentityService();
  }

  const storage = createSecureSessionStorage();
  const managedClient = createManagedSupabaseClient(config.value, storage);
  return createIdentityService(createSupabaseAuthAdapter(managedClient.client));
}

export const defaultIdentityService = createDefaultIdentityService();
