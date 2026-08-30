import { readPublicEnv } from "./public-env";

describe("readPublicEnv", () => {
  it("accepts only an HTTP(S) URL and publishable client key", () => {
    expect(
      readPublicEnv({
        EXPO_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_test",
      }),
    ).toEqual({
      ok: true,
      value: {
        supabaseUrl: "http://127.0.0.1:54321",
        supabasePublishableKey: "sb_publishable_local_test",
      },
    });
  });

  it.each([
    [{}, "MISSING_PUBLIC_CONFIG"],
    [
      {
        EXPO_PUBLIC_SUPABASE_URL: "not-a-url",
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_local_test",
      },
      "INVALID_PUBLIC_CONFIG",
    ],
    [
      {
        EXPO_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
        EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "service-role-value",
      },
      "FORBIDDEN_CLIENT_KEY",
    ],
  ])("rejects unsafe configuration without echoing values", (source, code) => {
    const result = readPublicEnv(source);

    expect(result).toEqual({ ok: false, code });
    expect(JSON.stringify(result)).not.toContain("service-role-value");
  });
});
