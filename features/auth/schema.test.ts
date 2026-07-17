import { describe, expect, it } from "vitest";
import { loginSchema, registerSchema, changePasswordSchema } from "./schema";

describe("emailSchema (via loginSchema)", () => {
  it("normalises case and surrounding whitespace", () => {
    const result = loginSchema.parse({
      email: "  Someone@Example.COM ",
      password: "x",
    });
    expect(result.email).toBe("someone@example.com");
  });

  it("rejects a malformed address", () => {
    expect(
      loginSchema.safeParse({ email: "not-an-email", password: "x" }).success,
    ).toBe(false);
  });
});

describe("loginSchema", () => {
  it("accepts a short password so legacy accounts can still sign in", () => {
    expect(
      loginSchema.safeParse({ email: "a@b.com", password: "old" }).success,
    ).toBe(true);
  });

  it("still requires a password to be present", () => {
    expect(
      loginSchema.safeParse({ email: "a@b.com", password: "" }).success,
    ).toBe(false);
  });
});

describe("registerSchema", () => {
  it("accepts a valid registration", () => {
    const result = registerSchema.safeParse({
      displayName: "Maria Santos",
      email: "maria@example.com",
      password: "correct horse battery",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a password under 8 characters", () => {
    const result = registerSchema.safeParse({
      displayName: "Maria",
      email: "maria@example.com",
      password: "short",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a password over 72 characters, which bcrypt would silently truncate", () => {
    const result = registerSchema.safeParse({
      displayName: "Maria",
      email: "maria@example.com",
      password: "a".repeat(73),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a one-character name", () => {
    const result = registerSchema.safeParse({
      displayName: "M",
      email: "maria@example.com",
      password: "long enough password",
    });
    expect(result.success).toBe(false);
  });
});

describe("changePasswordSchema", () => {
  it("accepts a matching pair", () => {
    const result = changePasswordSchema.safeParse({
      password: "a new long password",
      confirmPassword: "a new long password",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a mismatch, reporting it against the confirm field", () => {
    const result = changePasswordSchema.safeParse({
      password: "a new long password",
      confirmPassword: "a different one",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]!.path).toEqual(["confirmPassword"]);
    }
  });
});
