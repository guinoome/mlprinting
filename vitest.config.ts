import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["**/*.test.{ts,tsx}"],
    /**
     * Glob patterns, not bare directory names. `include` is `**` -rooted, so a
     * bare "node_modules" only excludes the top-level one — every nested
     * node_modules stays in scope, and third-party packages ship their own
     * *.test.ts files. `.worktrees/` is where the superpowers workflow puts a
     * per-phase git worktree, each with a full dependency install: without
     * these two patterns, running the suite from the repo root while a
     * worktree exists collects thousands of foreign tests and fails on them.
     */
    exclude: ["**/node_modules/**", "**/.next/**", "**/.worktrees/**", "e2e"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./", import.meta.url)),
      /**
       * `server-only` throws on import, to fail a CLIENT bundle at build time.
       * Vitest runs in Node — the very environment these modules are written
       * for — so that guard is inverted here and makes any server module
       * untestable. React ships `empty.js` for exactly this substitution: it is
       * what the package's own "react-server" export condition resolves to.
       *
       * The build-time protection is unaffected. Next still resolves the real
       * module, so importing a server module from a client component still
       * fails the build.
       */
      "server-only": fileURLToPath(
        new URL("./node_modules/server-only/empty.js", import.meta.url),
      ),
    },
  },
});
