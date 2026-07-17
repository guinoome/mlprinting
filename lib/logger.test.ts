import { describe, expect, it, vi, afterEach } from "vitest";
import { logger } from "./logger";

function captured(spy: ReturnType<typeof vi.spyOn>) {
  return JSON.parse((spy.mock.calls[0]![0] as string) ?? "{}");
}

afterEach(() => vi.restoreAllMocks());

describe("logger", () => {
  it("emits structured JSON with level and source", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("hello", { userId: "u1" });

    const entry = captured(spy);
    expect(entry.level).toBe("info");
    expect(entry.message).toBe("hello");
    expect(entry.userId).toBe("u1");
    expect(entry.source).toBe("server");
  });

  it("redacts credential-shaped keys", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("login", {
      email: "a@b.com",
      password: "hunter2",
      accessToken: "abc",
    });

    const entry = captured(spy);
    expect(entry.email).toBe("a@b.com");
    expect(entry.password).toBe("[redacted]");
    expect(entry.accessToken).toBe("[redacted]");
  });

  it("report() keeps the stack from a thrown Error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.report(new Error("boom"), { route: "/dashboard" });

    const entry = captured(spy);
    expect(entry.level).toBe("error");
    expect(entry.message).toBe("boom");
    expect(entry.route).toBe("/dashboard");
    expect(entry.error.stack).toContain("boom");
  });

  it("report() survives a non-Error throw", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logger.report("just a string");

    const entry = captured(spy);
    expect(entry.error.name).toBe("NonError");
    expect(entry.message).toBe("just a string");
  });
});
