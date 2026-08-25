import type { PublicEnv } from "../config/public-env";
import type { SupabaseSessionStorage } from "../auth/secure-session-storage";
import type { SupabaseClient } from "@supabase/supabase-js";

import {
  createManagedSupabaseClient,
  type ManagedSupabaseClientDependencies,
} from "./supabase-client";
import type { Database } from "./database.types";

const config: PublicEnv = {
  supabaseUrl: "http://127.0.0.1:54321",
  supabasePublishableKey: "sb_publishable_local_test",
};

const storage: SupabaseSessionStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

function createHarness(currentState: "active" | "background" | "inactive") {
  const startAutoRefresh = jest.fn();
  const stopAutoRefresh = jest.fn();
  const client = {
    auth: { startAutoRefresh, stopAutoRefresh },
  } as unknown as SupabaseClient<Database>;
  const createClient = jest.fn(() => client);
  const remove = jest.fn();
  let listener: ((state: "active" | "background" | "inactive") => void) | null =
    null;
  const appState = {
    currentState,
    addEventListener: jest.fn(
      (
        _event: "change",
        nextListener: (state: "active" | "background" | "inactive") => void,
      ) => {
        listener = nextListener;
        return { remove };
      },
    ),
  };
  const dependencies: ManagedSupabaseClientDependencies = {
    createClient: createClient as ManagedSupabaseClientDependencies["createClient"],
    appState: appState as ManagedSupabaseClientDependencies["appState"],
  };

  return {
    appState,
    client,
    createClient,
    dependencies,
    emit(state: "active" | "background" | "inactive") {
      listener?.(state);
    },
    remove,
    startAutoRefresh,
    stopAutoRefresh,
  };
}

describe("createManagedSupabaseClient", () => {
  it("configures the only client to persist sessions in secure storage", () => {
    const harness = createHarness("active");

    const managed = createManagedSupabaseClient(
      config,
      storage,
      harness.dependencies,
    );

    expect(harness.createClient).toHaveBeenCalledTimes(1);
    expect(harness.createClient).toHaveBeenCalledWith(
      config.supabaseUrl,
      config.supabasePublishableKey,
      {
        auth: {
          storage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
          lock: expect.any(Function),
        },
      },
    );
    expect(managed.client).toBe(harness.client);
    expect(harness.appState.addEventListener).toHaveBeenCalledTimes(1);
    expect(harness.startAutoRefresh).toHaveBeenCalledTimes(1);
    expect(harness.stopAutoRefresh).not.toHaveBeenCalled();
  });

  it("refreshes only while active and releases lifecycle resources on dispose", () => {
    const harness = createHarness("background");
    const managed = createManagedSupabaseClient(
      config,
      storage,
      harness.dependencies,
    );

    expect(harness.stopAutoRefresh).toHaveBeenCalledTimes(1);

    harness.emit("active");
    harness.emit("inactive");
    harness.emit("background");

    expect(harness.startAutoRefresh).toHaveBeenCalledTimes(1);
    expect(harness.stopAutoRefresh).toHaveBeenCalledTimes(3);

    managed.dispose();

    expect(harness.remove).toHaveBeenCalledTimes(1);
    expect(harness.stopAutoRefresh).toHaveBeenCalledTimes(4);
  });
});
