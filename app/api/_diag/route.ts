import { prisma } from "@/lib/db";

// TEMPORARY diagnostic — removed once the production DB connection is fixed.
// Reports whether a query succeeds and, if not, the error, with no secrets.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env.DATABASE_URL ?? "";
  // Host only — never the password.
  const host = url.replace(/^[^@]*@/, "").split(/[/?]/)[0] || "(unset)";
  try {
    const count = await prisma.template.count();
    return Response.json({ ok: true, templateCount: count, host });
  } catch (error) {
    return Response.json({
      ok: false,
      host,
      name: (error as Error).name,
      message: (error as Error).message.slice(0, 400),
    });
  }
}
