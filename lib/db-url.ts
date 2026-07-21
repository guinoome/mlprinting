/**
 * Connection-string adapter — routes around an infrastructure limitation and
 * normalises a hand-edited URL.
 *
 * Two problems it solves, both seen in production:
 *
 * 1. Supabase's direct host `db.<ref>.supabase.co` is IPv6-only, and serverless
 *    platforms (Vercel) are IPv4-only, so Prisma there can't reach it. The fix
 *    is Supabase's pooler (IPv4) — a different host, port and username.
 *
 * 2. A `DATABASE_URL` entered by hand is easy to get slightly wrong: the wrong
 *    username (`postgresql` instead of `postgres`), or a password with a raw
 *    `#`, `/`, `?` or space that isn't percent-encoded and so breaks URL
 *    parsing. `new URL()` throws or misparses on those.
 *
 * So this does NOT use `new URL()`. It matches the direct-host shape by pattern
 * — anchored on the known `db.<ref>.supabase.co` host, which lets the password
 * contain any character unambiguously — then rebuilds a correct pooler URL:
 * fixed `postgres.<ref>` username, a freshly percent-encoded password, the
 * pooler host and port. Anything that is not the direct host (already pooled, a
 * local database) is returned untouched.
 *
 * Pure and side-effect free; it never logs the password, only moves it.
 */

export const DEFAULT_POOLER_HOST = "aws-1-ap-south-1.pooler.supabase.com";

// scheme :// user : password @ db.<ref>.supabase.co [:port] [/db] [?params]
// The password group is greedy and anchored on the known host, so ':' or '@'
// inside the password does not confuse it.
const DIRECT =
  /^postgres(?:ql)?:\/\/[^:/@]*:(.*)@db\.([a-z0-9]+)\.supabase\.co(?::\d+)?(\/[^?]*)?(?:\?.*)?$/;

/** Decode a possibly-encoded password without throwing on a stray '%'. */
function decodeSafely(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function toPoolerUrl(databaseUrl: string, poolerHost: string): string {
  const match = databaseUrl.match(DIRECT);
  // Not Supabase's direct host — a pooler URL, a local database, anything else.
  // Use exactly as given.
  if (!match) return databaseUrl;

  const [, rawPassword, ref, path = "/postgres"] = match;
  // Normalise the password to a correctly-encoded form, whether it arrived raw
  // (with a literal '#') or already encoded (with '%23').
  const password = encodeURIComponent(decodeSafely(rawPassword));

  return (
    `postgresql://postgres.${ref}:${password}@${poolerHost}:6543${path}` +
    `?pgbouncer=true&connection_limit=1`
  );
}

/** The URL Prisma should actually connect with, given the environment. */
export function resolveDatabaseUrl(
  databaseUrl: string | undefined,
): string | undefined {
  if (!databaseUrl) return databaseUrl;
  const poolerHost = process.env.SUPABASE_POOLER_HOST ?? DEFAULT_POOLER_HOST;
  return toPoolerUrl(databaseUrl, poolerHost);
}
