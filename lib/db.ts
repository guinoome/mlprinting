import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton.
 *
 * Next.js dev-mode hot reload re-executes modules, which would otherwise open a
 * new connection pool on every reload until Postgres refuses connections.
 * Stash the instance on globalThis to survive reloads; production creates one.
 *
 * Constructed lazily behind a Proxy, for the same reason lib/env.ts reads env
 * lazily: `next build` prerenders pages with no DATABASE_URL, and PrismaClient
 * throws the moment it is constructed without one. Instantiating at module load
 * would mean any page that imports this file fails the secret-less CI build.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  });
}

function getClient(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const client = createClient();
    // In production a module is evaluated once, so the local const suffices;
    // the global is what dev hot reload reconnects to.
    if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
    else globalForPrisma.prisma = client;
  }
  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    return Reflect.get(getClient(), property);
  },
});

/** True when a database connection string is present. Mirrors isSupabaseConfigured(). */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}
