import { describe, expect, it } from "vitest";
import { readNotificationPayload } from "./types";

describe("readNotificationPayload", () => {
  it("accepts the persisted dashboard payload shape", () => {
    expect(
      readNotificationPayload({
        title: "Ready",
        message: "Open it",
        href: "/dashboard",
      }),
    ).toEqual({ title: "Ready", message: "Open it", href: "/dashboard" });
  });

  it("rejects malformed JSON instead of rendering an unsafe link", () => {
    expect(
      readNotificationPayload({
        title: "Ready",
        message: "Open it",
        href: "javascript:alert(1)",
      }),
    ).toBeNull();
    expect(readNotificationPayload(["not", "an", "object"])).toBeNull();
  });
});
