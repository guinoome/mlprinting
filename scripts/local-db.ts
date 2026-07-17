/**
 * A local Postgres, with nothing to install.
 *
 * PGlite is real Postgres compiled to WebAssembly; pglite-socket puts it behind
 * a TCP socket, so Prisma connects to it with an ordinary connection string and
 * cannot tell the difference. That means migrations, the seed, and every query
 * in the app can be exercised offline.
 *
 * What this is for: developing and verifying without credentials. Supabase is
 * still the real database — see docs/deployment-workflow.md — and this is not a
 * substitute for testing against it before a release. It is the difference
 * between "the types compile" and "the query runs".
 *
 * Data lives in .pglite/ and is gitignored. Delete that folder to reset.
 *
 *   pnpm db:local          # start on 55432
 *   DATABASE_URL="postgresql://postgres:postgres@localhost:55432/postgres" pnpm prisma migrate dev
 */
import { PGlite } from "@electric-sql/pglite";
import { PGLiteSocketServer } from "@electric-sql/pglite-socket";

const PORT = Number(process.env.LOCAL_DB_PORT ?? 55432);
const DATA_DIR = process.env.LOCAL_DB_DIR ?? "./.pglite";

async function main() {
  const db = await PGlite.create({ dataDir: DATA_DIR });
  const server = new PGLiteSocketServer({ db, port: PORT, host: "127.0.0.1" });

  await server.start();

  console.log(`Local Postgres (PGlite) listening on 127.0.0.1:${PORT}`);
  console.log(`Data directory: ${DATA_DIR}`);
  console.log("");
  console.log("Point the app at it:");
  console.log(
    `  DATABASE_URL="postgresql://postgres:postgres@localhost:${PORT}/postgres"`,
  );
  console.log("");
  console.log("Ctrl+C to stop.");

  const shutdown = async () => {
    console.log("\nStopping…");
    await server.stop();
    await db.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((error) => {
  console.error("Could not start the local database:", error);
  process.exit(1);
});
