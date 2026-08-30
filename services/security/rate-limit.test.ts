import { describe, expect, it } from "vitest";
import { requestAddress } from "./rate-limit";

describe("requestAddress", () => {
  it("uses the edge-provided first address and never persists the raw value itself", () => {
    expect(
      requestAddress(
        new Headers({ "x-forwarded-for": "203.0.113.9, 10.0.0.1" }),
      ),
    ).toBe("203.0.113.9");
  });

  it("uses one conservative shared bucket when no proxy address exists", () => {
    expect(requestAddress(new Headers())).toBe("unknown");
  });
});
