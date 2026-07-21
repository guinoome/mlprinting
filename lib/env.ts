/**
 * Environment configuration — single source of truth for env access.
 *
 * Read lazily rather than at module load so `next build` succeeds without a
 * populated .env.local (CI builds the repo before secrets are wired up).
 * A missing var fails loudly at the point of use, not silently as undefined.
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Copy .env.example to .env.local and fill it in — see docs/development-workflow.md`,
    );
  }
  return value;
}

/**
 * A URL variable, validated and normalised.
 *
 * Format matters more here than it looks. `env.app.url` is fed to `new URL()`
 * for OG `metadataBase` and is concatenated into every QR code. A scheme-less
 * value — what you get by pasting a domain out of a hosting dashboard — either
 * throws deep inside page rendering or, worse, silently produces QR codes that
 * scan to nothing. Both failures surface long after the deploy, on a guest's
 * phone. Failing here, with the variable's name in the message, is the whole
 * point.
 *
 * The trailing slash is stripped so callers can concatenate a path without
 * producing a double slash.
 */
function urlVar(name: string, value: string): string {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(
      `Invalid ${name}: "${value}" is not a URL. ` +
        `It needs a scheme — for example https://mlprinting.vercel.app`,
    );
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(
      `Invalid ${name}: "${value}" must use http or https, not ${parsed.protocol}`,
    );
  }

  return value.replace(/\/+$/, "");
}

export const env = {
  supabase: {
    get url() {
      return urlVar(
        "NEXT_PUBLIC_SUPABASE_URL",
        required(
          "NEXT_PUBLIC_SUPABASE_URL",
          process.env.NEXT_PUBLIC_SUPABASE_URL,
        ),
      );
    },
    /**
     * The public client key — Supabase's new `sb_publishable_…` key, or the
     * legacy `anon` JWT it replaces.
     *
     * Prefers the new variable and falls back to the old one, so the app keeps
     * working whether the deployment has migrated its Supabase keys yet or not.
     * Both are safe in the browser (that is the whole point of a publishable
     * key); the fallback is a transition convenience, not a secret risk.
     */
    get publishableKey() {
      return required(
        "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or legacy NEXT_PUBLIC_SUPABASE_ANON_KEY)",
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      );
    },
  },
  app: {
    get url() {
      const value = process.env.NEXT_PUBLIC_APP_URL;
      // Unset is fine and expected in local dev; malformed is not.
      if (!value) return "http://localhost:3000";
      return urlVar("NEXT_PUBLIC_APP_URL", value);
    },
  },
} as const;

/** True when Supabase env vars are present. Lets code degrade gracefully. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
  );
}
