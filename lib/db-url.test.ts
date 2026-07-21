import { describe, expect, it } from "vitest";
import { toPoolerUrl } from "./db-url";

const HOST = "aws-1-ap-south-1.pooler.supabase.com";

describe("toPoolerUrl", () => {
  it("reroutes the direct Supabase host to the transaction pooler", () => {
    const out = toPoolerUrl(
      "postgresql://postgres:pw@db.abc123.supabase.co:5432/postgres",
      HOST,
    );
    const u = new URL(out);
    expect(u.hostname).toBe(HOST);
    expect(u.port).toBe("6543");
    expect(u.username).toBe("postgres.abc123");
    expect(u.searchParams.get("pgbouncer")).toBe("true");
    expect(u.searchParams.get("connection_limit")).toBe("1");
    expect(u.pathname).toBe("/postgres");
  });

  it("carries a password with special characters across without double-encoding", () => {
    // %2A is an encoded '*'. It must stay %2A, not become %252A — the bug that
    // made an earlier region scan fail against every pooler.
    const out = toPoolerUrl(
      "postgresql://postgres:Ajlf2s7ps7%2A@db.abc123.supabase.co:5432/postgres",
      HOST,
    );
    expect(new URL(out).password).toBe("Ajlf2s7ps7%2A");
  });

  it("leaves a local database untouched", () => {
    const local = "postgresql://postgres:postgres@localhost:55432/postgres";
    expect(toPoolerUrl(local, HOST)).toBe(local);
  });

  it("leaves an already-pooled URL untouched", () => {
    const pooled = `postgresql://postgres.abc123:pw@${HOST}:6543/postgres?pgbouncer=true`;
    expect(toPoolerUrl(pooled, HOST)).toBe(pooled);
  });

  it("keeps an explicit connection_limit if one is already set", () => {
    const out = toPoolerUrl(
      "postgresql://postgres:pw@db.abc123.supabase.co:5432/postgres?connection_limit=5",
      HOST,
    );
    expect(new URL(out).searchParams.get("connection_limit")).toBe("5");
  });

  it("returns unparseable input unchanged rather than throwing", () => {
    expect(toPoolerUrl("not a url", HOST)).toBe("not a url");
  });
});
