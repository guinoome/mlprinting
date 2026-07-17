import { describe, expect, it } from "vitest";
import {
  BUILDER_STEPS,
  FIRST_STEP,
  LAST_STEP,
  REQUIRED_STEPS,
  isBuilderStep,
  getStep,
  stepNumber,
  nextStep,
  previousStep,
  resolveStep,
} from "./steps";

describe("BUILDER_STEPS — shape", () => {
  it("has unique, URL-safe slugs", () => {
    const slugs = BUILDER_STEPS.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9-]+$/);
  });

  it("starts at the template and ends at the preview, per Ph3 §1", () => {
    expect(FIRST_STEP).toBe("template");
    expect(LAST_STEP).toBe("preview");
  });

  it("describes every step — this is a guided interview, not a form dump", () => {
    for (const step of BUILDER_STEPS) {
      expect(step.label.length).toBeGreaterThan(0);
      expect(step.description.length).toBeGreaterThan(0);
    }
  });

  it("does not make Save Draft a step", () => {
    // Ph3.md §8 requires autosave. A workflow with a Save screen has not
    // autosaved — saving is a control on every step instead.
    expect(BUILDER_STEPS.map((s) => s.slug)).not.toContain("save");
  });

  it("does not make Continue to Order a step", () => {
    // The order flow is Ph7, and Ph3's Out of Scope forbids it. It is the exit,
    // not a step in this workflow.
    expect(BUILDER_STEPS.map((s) => s.slug)).not.toContain("order");
  });

  it("marks the steps an invitation cannot do without", () => {
    expect(REQUIRED_STEPS).toEqual(["template", "event", "hosts", "venue"]);
  });

  it("treats content, media, and styling as optional", () => {
    // An invitation with no photos is thin; an invitation with no venue is
    // useless. Only the second should block finishing.
    for (const slug of ["content", "media", "personalize"]) {
      expect(getStep(slug)!.required).toBe(false);
    }
  });
});

describe("isBuilderStep", () => {
  it("accepts every registered step", () => {
    for (const step of BUILDER_STEPS)
      expect(isBuilderStep(step.slug)).toBe(true);
  });

  it("rejects anything else — this guards a URL segment", () => {
    expect(isBuilderStep("../../admin")).toBe(false);
    expect(isBuilderStep("")).toBe(false);
    expect(isBuilderStep("constructor")).toBe(false);
  });
});

describe("stepNumber", () => {
  it("is 1-based, for 'Step 3 of 8'", () => {
    expect(stepNumber("template")).toBe(1);
    expect(stepNumber("preview")).toBe(BUILDER_STEPS.length);
  });

  it("is 0 for an unknown step", () => {
    expect(stepNumber("nope")).toBe(0);
  });
});

describe("nextStep / previousStep", () => {
  it("walks forward through the whole workflow", () => {
    const visited: string[] = [FIRST_STEP];
    let current: string | null = FIRST_STEP;

    while ((current = nextStep(current!))) visited.push(current);

    expect(visited).toEqual(BUILDER_STEPS.map((s) => s.slug));
  });

  it("walks backward to the start", () => {
    expect(previousStep("event")).toBe("template");
    expect(previousStep(FIRST_STEP)).toBeNull();
  });

  it("stops at the end", () => {
    expect(nextStep(LAST_STEP)).toBeNull();
  });

  it("returns null for an unknown step rather than guessing", () => {
    expect(nextStep("nope")).toBeNull();
    expect(previousStep("nope")).toBeNull();
  });

  it("round-trips", () => {
    for (const step of BUILDER_STEPS) {
      const forward = nextStep(step.slug);
      if (forward) expect(previousStep(forward)).toBe(step.slug);
    }
  });
});

describe("resolveStep", () => {
  it("passes through a known step", () => {
    expect(resolveStep("venue")).toBe("venue");
  });

  it("falls back to the first step for junk, rather than 404ing", () => {
    // A draft whose stored currentStep was renamed should open at the start of
    // the customer's own work, not on an error page.
    expect(resolveStep("retired-step")).toBe(FIRST_STEP);
    expect(resolveStep(undefined)).toBe(FIRST_STEP);
    expect(resolveStep(null)).toBe(FIRST_STEP);
    expect(resolveStep("")).toBe(FIRST_STEP);
  });
});
