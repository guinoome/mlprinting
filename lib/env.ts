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

export const env = {
  supabase: {
    get url() {
      return required(
        "NEXT_PUBLIC_SUPABASE_URL",
        process.env.NEXT_PUBLIC_SUPABASE_URL,
      );
    },
    get anonKey() {
      return required(
        "NEXT_PUBLIC_SUPABASE_ANON_KEY",
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      );
    },
  },
  app: {
    get url() {
      return process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    },
  },
} as const;

/** True when Supabase env vars are present. Lets code degrade gracefully. */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
