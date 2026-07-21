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

  it("forces the correct username even if the URL had 'postgresql'", () => {
    // The real bug in production: username was 'postgresql', not 'postgres'.
    const out = toPoolerUrl(
      "postgresql://postgresql:pw@db.abc123.supabase.co:5432/postgres",
      HOST,
    );
    expect(new URL(out).username).toBe("postgres.abc123");
  });

  it("percent-encodes a raw special character in the password", () => {
    // A raw '#' truncates URL parsing; it must become %23. This is what broke
    // production after a password reset.
    const out = toPoolerUrl(
      "postgresql://postgres:Ab#cd@db.abc123.supabase.co:5432/postgres",
      HOST,
    );
    const u = new URL(out);
    expect(u.hostname).toBe(HOST);
    expect(u.password).toBe("Ab%23cd");
  });

  it("decodes an already-encoded password to its true value (no double-encoding)", () => {
    // %2A is '*', which needs no encoding, so the URL shows it decoded — the
    // point is the password VALUE is 'Ajlf*', not the double-encoded 'Ajlf%252A'.
    const out = toPoolerUrl(
      "postgresql://postgres:Ajlf%2A@db.abc123.supabase.co:5432/postgres",
      HOST,
    );
    expect(new URL(out).password).toBe("Ajlf*");
  });

  it("handles a literal percent that is not an encoding", () => {
    const out = toPoolerUrl(
      "postgresql://postgres:50%off@db.abc123.supabase.co:5432/postgres",
      HOST,
    );
    expect(new URL(out).password).toBe("50%25off");
  });

  it("tolerates a missing port", () => {
    const out = toPoolerUrl(
      "postgresql://postgres:pw@db.abc123.supabase.co/postgres",
      HOST,
    );
    expect(new URL(out).hostname).toBe(HOST);
  });

  it("leaves a local database untouched", () => {
    const local = "postgresql://postgres:postgres@localhost:55432/postgres";
    expect(toPoolerUrl(local, HOST)).toBe(local);
  });

  it("leaves an already-pooled URL untouched", () => {
    const pooled = `postgresql://postgres.abc123:pw@${HOST}:6543/postgres?pgbouncer=true`;
    expect(toPoolerUrl(pooled, HOST)).toBe(pooled);
  });

  it("returns unparseable input unchanged rather than throwing", () => {
    expect(toPoolerUrl("not a url", HOST)).toBe("not a url");
  });
});
