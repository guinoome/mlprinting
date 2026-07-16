import { PrismaClient } from "@prisma/client";

/**
 * Prisma client singleton.
 *
 * Next.js dev-mode hot reload re-executes modules, which would otherwise open a
 * new connection pool on every reload until Postgres refuses connections.
 * Stash the instance on globalThis to survive reloads; production creates one.
 */
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
