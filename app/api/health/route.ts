import { prisma } from "@/lib/db";

// Temporary DB health probe. Reports connectivity, the host Vercel is using
// (never the password), and any error, so the production DB failure can be
// diagnosed exactly. Removed once the connection is fixed.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.DATABASE_URL ?? "";
  const host = url.replace(/^[^@]*@/, "").split(/[/?]/)[0] || "(unset)";
  const usingPooler = host.includes("pooler.supabase.com");
  try {
    const count = await prisma.template.count();
    return Response.json({ ok: true, host, usingPooler, templateCount: count });
  } catch (error) {
    return Response.json({
      ok: false,
      host,
      usingPooler,
      name: (error as Error).name,
      message: (error as Error).message.slice(0, 300),
    });
  }
}
