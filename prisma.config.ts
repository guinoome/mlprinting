import { config } from "dotenv";

/**
 * Prisma CLI configuration — replaces the deprecated `package.json#prisma` field
 * (Prisma nags about this every run; this is what it's asking for).
 *
 * The one thing this file exists to fix: Prisma's own dotenv loading only ever
 * reads a file literally named `.env`. It never reads `.env.local` — that's a
 * Next.js-only convention. Every doc in this repo (development-workflow.md,
 * deployment-workflow.md) tells you to create `.env.local`, so without this,
 * `prisma migrate` / `prisma db seed` run against an empty environment and fail
 * with "Missing DATABASE_URL" even though the app itself starts fine.
 *
 * Loaded before Prisma resolves the schema's `env("DATABASE_URL")`, and it does
 * not override a variable already set in the shell — an explicit `export
 * DATABASE_URL=...` (as scripts/local-db.ts testing relies on) still wins. If
 * `.env.local` doesn't exist yet, this silently does nothing rather than error.
 */
config({ path: ".env.local" });

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
});
