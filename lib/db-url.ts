/**
 * Connection-string adapter — routes around an infrastructure limitation.
 *
 * Supabase's direct database host, `db.<ref>.supabase.co`, is IPv6-only.
 * Serverless platforms like Vercel are IPv4-only, so Prisma there fails with
 * "Can't reach database server". The fix is to connect through Supabase's
 * pooler (Supavisor), which is IPv4 — but that means a different host, port and
 * username.
 *
 * Rather than depend on every deployment getting a hand-edited `DATABASE_URL`
 * exactly right, this rewrites the direct host to the pooler at runtime,
 * carrying the existing password across untouched. A deployment can still set
 * `DATABASE_URL` straight to a pooler URL — anything that is not the direct
 * host is passed through unchanged, so this is a safety net, not an override.
 *
 * Pure and side-effect free, so the rewrite is unit-tested. It never reads or
 * logs the password; it only moves it from one URL to another via the URL API.
 */

/** The pooler host for this project, overridable if Supabase ever moves it. */
export const DEFAULT_POOLER_HOST = "aws-1-ap-south-1.pooler.supabase.com";

const DIRECT_HOST = /^db\.([a-z0-9]+)\.supabase\.co$/;

export function toPoolerUrl(databaseUrl: string, poolerHost: string): string {
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    // Not a URL we can parse — hand it back and let Prisma report the problem.
    return databaseUrl;
  }

  const match = url.hostname.match(DIRECT_HOST);
  // Only the IPv6-only direct host needs rerouting. A pooler host, a local
  // database, anything else — use exactly as given.
  if (!match) return databaseUrl;

  const ref = match[1];
  url.hostname = poolerHost;
  url.port = "6543";
  // Transaction-pooler auth requires the project ref in the username.
  url.username = `postgres.${ref}`;
  // Prisma needs this against a transaction-mode pooler; connection_limit=1 is
  // the serverless recommendation (one connection per function instance).
  url.searchParams.set("pgbouncer", "true");
  if (!url.searchParams.has("connection_limit")) {
    url.searchParams.set("connection_limit", "1");
  }

  return url.toString();
}

/** The URL Prisma should actually connect with, given the environment. */
export function resolveDatabaseUrl(
  databaseUrl: string | undefined,
): string | undefined {
  if (!databaseUrl) return databaseUrl;
  const poolerHost = process.env.SUPABASE_POOLER_HOST ?? DEFAULT_POOLER_HOST;
  return toPoolerUrl(databaseUrl, poolerHost);
}
