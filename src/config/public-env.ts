export type PublicEnv = {
  supabaseUrl: string;
  supabasePublishableKey: string;
};

export type PublicEnvErrorCode =
  | "MISSING_PUBLIC_CONFIG"
  | "INVALID_PUBLIC_CONFIG"
  | "FORBIDDEN_CLIENT_KEY";

export type PublicEnvResult =
  | { ok: true; value: PublicEnv }
  | { ok: false; code: PublicEnvErrorCode };

type PublicEnvSource = Partial<
  Record<
    | "EXPO_PUBLIC_SUPABASE_URL"
    | "EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    string | undefined
  >
>;

export function readPublicEnv(source: PublicEnvSource): PublicEnvResult {
  const supabaseUrl = source.EXPO_PUBLIC_SUPABASE_URL;
  const supabasePublishableKey =
    source.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabasePublishableKey) {
    return { ok: false, code: "MISSING_PUBLIC_CONFIG" };
  }

  if (!supabasePublishableKey.startsWith("sb_publishable_")) {
    return { ok: false, code: "FORBIDDEN_CLIENT_KEY" };
  }

  try {
    const url = new URL(supabaseUrl);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return { ok: false, code: "INVALID_PUBLIC_CONFIG" };
    }
  } catch {
    return { ok: false, code: "INVALID_PUBLIC_CONFIG" };
  }

  return {
    ok: true,
    value: { supabaseUrl, supabasePublishableKey },
  };
}
