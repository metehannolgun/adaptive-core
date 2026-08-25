import { spawnSync } from "node:child_process";

import { createClient } from "@supabase/supabase-js";

function fail(operation, category) {
  throw new Error(`${operation}: ${category}`);
}

function errorCategory(error) {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = error.status;
    if (typeof status === "number") {
      return status === 0 ? "network" : `http_${status}`;
    }
  }

  return "auth";
}

function assert(condition, operation) {
  if (!condition) {
    fail(operation, "unexpected_response");
  }
}

function loadLocalSupabaseStatus() {
  const result = spawnSync(
    "./node_modules/.bin/supabase",
    ["status", "--output", "json"],
    { encoding: "utf8" },
  );

  if (result.status !== 0) {
    fail("local_status", "cli");
  }

  try {
    return JSON.parse(result.stdout);
  } catch {
    fail("local_status", "invalid_json");
  }
}

function localAuthConfig(status) {
  const supabaseUrl = status.API_URL;
  const publishableKey = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
  const serviceRoleKey = status.SERVICE_ROLE_KEY;

  if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
    fail("local_status", "missing_auth_config");
  }

  return { supabaseUrl, publishableKey, serviceRoleKey };
}

function createLocalClient(supabaseUrl, key) {
  return createClient(supabaseUrl, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function queryOwnRow(client, table, columns) {
  const { data, error } = await client.from(table).select(columns);

  if (error !== null) {
    fail(`${table}_select`, errorCategory(error));
  }

  assert(Array.isArray(data) && data.length === 1, `${table}_select`);
  return data[0];
}

async function deleteFixtureUser(adminClient, userId) {
  if (!userId) {
    return;
  }

  const { error } = await adminClient.auth.admin.deleteUser(userId);
  if (error !== null) {
    fail("anonymous_cleanup", errorCategory(error));
  }
}

async function signOutLocal(client) {
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error !== null) {
    fail("anonymous_sign_out", errorCategory(error));
  }
}

function assertProfile(row, userId) {
  const expectedKeys = ["created_at", "locale", "updated_at", "user_id"];
  assert(
    Object.keys(row).sort().join(",") === expectedKeys.join(","),
    "profiles_shape",
  );
  assert(row.locale === "en" || row.locale === "tr", "profiles_locale");
  assert(row.user_id === userId, "profiles_user_id");
  assert(typeof row.created_at === "string", "profiles_created_at");
  assert(typeof row.updated_at === "string", "profiles_updated_at");
}

function assertTrainingPreferences(row, userId) {
  assert(row.preferred_duration_minutes === 10, "training_defaults");
  assert(row.sound_enabled === true, "training_defaults");
  assert(row.cues_enabled === true, "training_defaults");
  assert(row.reminders_enabled === false, "training_defaults");
  assert(row.user_id === userId, "training_user_id");
  assert(typeof row.created_at === "string", "training_created_at");
  assert(typeof row.updated_at === "string", "training_updated_at");
}

function assertPrivacyPreferences(row, userId) {
  assert(row.analytics_consent_status === "pending", "privacy_defaults");
  assert(row.user_id === userId, "privacy_user_id");
  assert(typeof row.created_at === "string", "privacy_created_at");
  assert(typeof row.updated_at === "string", "privacy_updated_at");
}

async function main() {
  const { supabaseUrl, publishableKey, serviceRoleKey } = localAuthConfig(
    loadLocalSupabaseStatus(),
  );
  const anonymousClient = createLocalClient(supabaseUrl, publishableKey);
  const adminClient = createLocalClient(supabaseUrl, serviceRoleKey);
  let userId;
  let primaryError;

  try {
    const { data, error } = await anonymousClient.auth.signInAnonymously();
    if (error !== null) {
      fail("anonymous_sign_in", errorCategory(error));
    }

    const user = data.user;
    assert(typeof user?.id === "string", "anonymous_sign_in");
    assert(user.is_anonymous === true, "anonymous_sign_in");
    userId = user.id;

    const profile = await queryOwnRow(
      anonymousClient,
      "profiles",
      "user_id, locale, created_at, updated_at",
    );
    const trainingPreferences = await queryOwnRow(
      anonymousClient,
      "training_preferences",
      "user_id, preferred_duration_minutes, sound_enabled, cues_enabled, reminders_enabled, created_at, updated_at",
    );
    const privacyPreferences = await queryOwnRow(
      anonymousClient,
      "privacy_preferences",
      "user_id, analytics_consent_status, created_at, updated_at",
    );

    assertProfile(profile, userId);
    assertTrainingPreferences(trainingPreferences, userId);
    assertPrivacyPreferences(privacyPreferences, userId);
  } catch (error) {
    primaryError = error;
    throw error;
  } finally {
    const cleanup = await Promise.allSettled([
      deleteFixtureUser(adminClient, userId),
      signOutLocal(anonymousClient),
    ]);

    if (!primaryError && cleanup.some((result) => result.status === "rejected")) {
      fail("anonymous_cleanup", "auth");
    }
  }

  console.log("Local anonymous identity integration test passed.");
}

main().catch((error) => {
  console.error(
    error instanceof Error ? error.message : "anonymous_identity_test: unknown",
  );
  process.exitCode = 1;
});
