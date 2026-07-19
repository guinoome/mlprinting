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
    },
  },
});
