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
  const diag = {
    rawLength: raw.length,
    firstChars: JSON.stringify(raw.slice(0, 15)),
    startsOk:
      raw.startsWith("postgresql://") || raw.startsWith("postgres://"),
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
