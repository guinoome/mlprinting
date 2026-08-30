import { describe, expect, it } from "vitest";
import { approvedContentMayBePublic, memoryWindowState } from "./policy";
const now = new Date("2026-08-30T12:00:00Z");
describe("event memory policy", () => {
  it("enforces enablement and both time boundaries", () => {
    expect(
      memoryWindowState({ enabled: false, opensAt: null, closesAt: null }, now),
    ).toBe("disabled");
    expect(
      memoryWindowState(
        { enabled: true, opensAt: new Date("2026-08-31Z"), closesAt: null },
        now,
      ),
    ).toBe("not-open");
    expect(
      memoryWindowState(
        { enabled: true, opensAt: null, closesAt: new Date("2026-08-29Z") },
        now,
      ),
    ).toBe("closed");
    expect(
      memoryWindowState({ enabled: true, opensAt: null, closesAt: null }, now),
    ).toBe("open");
  });
  it("never exposes private collection or archive modes as a public gallery", () => {
    expect(approvedContentMayBePublic("PRIVATE_COLLECTION")).toBe(false);
    expect(approvedContentMayBePublic("POST_EVENT_ARCHIVE")).toBe(false);
    expect(approvedContentMayBePublic("GUEST_GALLERY")).toBe(true);
    expect(approvedContentMayBePublic("LIVE_WALL")).toBe(true);
  });
});
