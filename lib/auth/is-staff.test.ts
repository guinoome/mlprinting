import { describe, expect, it } from "vitest";
import { isStaff } from "./is-staff";

describe("isStaff", () => {
  it("accepts admins and staff", () => {
    expect(isStaff({ role: "ADMIN" })).toBe(true);
    expect(isStaff({ role: "STAFF" })).toBe(true);
  });

  it("rejects customers", () => {
    expect(isStaff({ role: "CUSTOMER" })).toBe(false);
  });

  it("rejects a missing profile", () => {
    expect(isStaff(null)).toBe(false);
  });
});
