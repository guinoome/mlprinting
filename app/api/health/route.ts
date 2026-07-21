import { prisma } from "@/lib/db";
import { resolveDatabaseUrl } from "@/lib/db-url";

// Temporary DB health probe. Reports connectivity and the host actually used
// (never the password). Removed once the connection is confirmed.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hostOf(url: string): string {
  return url.replace(/^[^@]*@/, "").split(/[/?]/)[0] || "(unset)";
}

export async function GET() {
  const raw = process.env.DATABASE_URL ?? "";
  // Safe diagnostic: the first 15 chars are at most "postgresql://po" —
  // the password only begins around char 22, so this never leaks it.
  // JSON.stringify exposes a hidden leading space, quote, or BOM.
  // Mask the password (between the scheme's user ':' and the '@'), then show
  // the whole shape so a structural malformation is visible without the secret.
  const masked = raw.replace(/(:\/\/[^:@/]+:)[^@]*(@)/, "$1***$2");
  const diag = {
    rawLength: raw.length,
    startsOk:
      raw.startsWith("postgresql://") || raw.startsWith("postgres://"),
    // Only reveal if a password was actually masked out, or there's no '@' to
    // leak — never expose an unmasked value.
    urlShape:
      masked !== raw || !raw.includes("@")
        ? JSON.stringify(masked)
        : "(withheld: userinfo could not be masked)",
  };
  // The resolved URL is what Prisma actually connects with — after the direct
  // host is rerouted to the pooler (lib/db-url.ts).
  const resolved = resolveDatabaseUrl(raw) ?? "";
  const host = hostOf(resolved);
  const usingPooler = host.includes("pooler.supabase.com");
  try {
    const count = await prisma.template.count();
    return Response.json({
      ok: true,
      host,
      usingPooler,
      rerouted: hostOf(raw) !== host,
      templateCount: count,
      ...diag,
    });
  } catch (error) {
    return Response.json({
      ok: false,
      host,
      usingPooler,
      ...diag,
      name: (error as Error).name,
      message: (error as Error).message.slice(0, 300),
    });
  }
}
