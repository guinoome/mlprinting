import { describe, expect, it } from "vitest";
import { planLifecycleNotifications } from "./planner";

const base = {
  invitationId: "event-1",
  eventDate: new Date("2026-09-10T00:00:00Z"),
  emailNotifications: true,
  marketingEmails: true,
  memory: { enabled: true, opensAt: null, closesAt: null },
};
describe("lifecycle notification planner", () => {
  it("plans event, archive, thank-you, and consented review prompts", () => {
    expect(planLifecycleNotifications(base).map((item) => item.kind)).toEqual([
      "MEMORY_PROMPT",
      "ARCHIVE_READY",
      "THANK_YOU",
      "REVIEW_REQUEST",
    ]);
  });
  it("omits marketing review when the customer has not opted in", () => {
    expect(
      planLifecycleNotifications({ ...base, marketingEmails: false }).some(
        (item) => item.kind === "REVIEW_REQUEST",
      ),
    ).toBe(false);
  });
  it("does not invent a schedule without an event date", () => {
    expect(planLifecycleNotifications({ ...base, eventDate: null })).toEqual(
      [],
    );
  });
});
