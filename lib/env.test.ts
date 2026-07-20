import { afterEach, describe, expect, it } from "vitest";
import { env, isSupabaseConfigured } from "./env";

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe("env.app.url", () => {
  it("defaults to localhost when unset", () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    expect(env.app.url).toBe("http://localhost:3000");
  });

  it("returns a well-formed absolute URL unchanged", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://mlprinting.vercel.app";
    expect(env.app.url).toBe("https://mlprinting.vercel.app");
  });

  it("strips a trailing slash so callers can concatenate paths safely", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://mlprinting.vercel.app/";
    expect(env.app.url).toBe("https://mlprinting.vercel.app");
  });

  /**
   * A scheme-less value is the realistic mistake — it is what you get by
   * pasting a domain out of a dashboard. It breaks `new URL()` for OG
   * metadataBase and silently corrupts every QR code, so it must fail loudly
   * rather than propagate.
   */
  it("rejects a value with no scheme", () => {
    process.env.NEXT_PUBLIC_APP_URL = "mlprinting.vercel.app";
    expect(() => env.app.url).toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it("rejects a non-http scheme", () => {
    process.env.NEXT_PUBLIC_APP_URL = "ftp://mlprinting.vercel.app";
    expect(() => env.app.url).toThrow(/NEXT_PUBLIC_APP_URL/);
  });

  it("rejects unparseable junk", () => {
    process.env.NEXT_PUBLIC_APP_URL = "not a url";
    expect(() => env.app.url).toThrow(/NEXT_PUBLIC_APP_URL/);
  });
});

describe("env.supabase.url", () => {
  it("rejects a malformed Supabase URL", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "gunylc.supabase.co";
    expect(() => env.supabase.url).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("accepts a well-formed one", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://gunylc.supabase.co";
    expect(env.supabase.url).toBe("https://gunylc.supabase.co");
  });

  it("still throws when missing entirely", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    expect(() => env.supabase.url).toThrow(/Missing required/);
  });
});

describe("isSupabaseConfigured", () => {
  it("is false when either variable is absent", () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "key";
    expect(isSupabaseConfigured()).toBe(false);
  });

  it("is true when both are present", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://gunylc.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "key";
    expect(isSupabaseConfigured()).toBe(true);
  });
});
