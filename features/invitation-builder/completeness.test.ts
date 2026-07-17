import { describe, expect, it } from "vitest";
import {
  completionErrors,
  isComplete,
  incompleteSteps,
  completionPercent,
  type CompletenessSnapshot,
} from "./completeness";

const complete: CompletenessSnapshot = {
  templateId: "t1",
  eventTitle: "Maria & Jose",
  eventDate: new Date("2027-03-14"),
  hostCount: 2,
  venueCount: 1,
};

const empty: CompletenessSnapshot = {
  templateId: null,
  eventTitle: null,
  eventDate: null,
  hostCount: 0,
  venueCount: 0,
};

describe("completionErrors", () => {
  it("finds nothing wrong with a complete invitation", () => {
    expect(completionErrors(complete)).toEqual([]);
  });

  it("reports every missing requirement at once, not one at a time", () => {
    // Fixing one thing only to be told about the next is a worse experience
    // than seeing the whole list.
    expect(completionErrors(empty)).toHaveLength(5);
  });

  it("attributes each issue to the step that fixes it", () => {
    const steps = completionErrors(empty).map((i) => i.step);
    expect(steps).toContain("template");
    expect(steps).toContain("event");
    expect(steps).toContain("hosts");
    expect(steps).toContain("venue");
  });

  it("says what to do, not what failed", () => {
    for (const issue of completionErrors(empty)) {
      expect(issue.message).toMatch(/^(Choose|Add)/);
    }
  });

  it("treats a whitespace-only title as missing", () => {
    const issues = completionErrors({ ...complete, eventTitle: "   " });
    expect(issues.some((i) => i.message.includes("title"))).toBe(true);
  });

  it("requires at least one host", () => {
    expect(completionErrors({ ...complete, hostCount: 0 })).toHaveLength(1);
  });

  it("requires at least one venue", () => {
    expect(completionErrors({ ...complete, venueCount: 0 })).toHaveLength(1);
  });

  it("does not require content, media, or styling", () => {
    // An invitation with no photos is thin. One with no venue is useless.
    expect(isComplete(complete)).toBe(true);
  });
});

describe("isComplete", () => {
  it("is true only when nothing is outstanding", () => {
    expect(isComplete(complete)).toBe(true);
    expect(isComplete(empty)).toBe(false);
    expect(isComplete({ ...complete, templateId: null })).toBe(false);
  });
});

describe("incompleteSteps", () => {
  it("is empty for a complete invitation", () => {
    expect(incompleteSteps(complete).size).toBe(0);
  });

  it("de-duplicates a step with two issues", () => {
    // The event step is missing both a title and a date — that is one step to
    // visit, not two.
    const steps = incompleteSteps({
      ...complete,
      eventTitle: null,
      eventDate: null,
    });
    expect(steps.has("event")).toBe(true);
    expect(steps.size).toBe(1);
  });

  it("never flags an optional step", () => {
    const steps = incompleteSteps(empty);
    for (const optional of ["content", "media", "personalize", "preview"]) {
      expect(steps.has(optional)).toBe(false);
    }
  });
});

describe("completionPercent", () => {
  it("is 100 when done", () => {
    expect(completionPercent(complete)).toBe(100);
  });

  it("is 0 for an empty draft", () => {
    expect(completionPercent(empty)).toBe(0);
  });

  it("counts required steps only, so optional work is not fake progress", () => {
    // template done, event/hosts/venue not: 1 of 4.
    const partial: CompletenessSnapshot = { ...empty, templateId: "t1" };
    expect(completionPercent(partial)).toBe(25);
  });

  it("rises as steps are finished", () => {
    const withEvent: CompletenessSnapshot = {
      ...empty,
      templateId: "t1",
      eventTitle: "X",
      eventDate: new Date(),
    };
    expect(completionPercent(withEvent)).toBe(50);
  });

  it("never exceeds 100", () => {
    expect(
      completionPercent({ ...complete, hostCount: 99, venueCount: 99 }),
    ).toBe(100);
  });
});
