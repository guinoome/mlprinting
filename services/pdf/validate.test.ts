import { describe, expect, it } from "vitest";
import { buildReport } from "./validate";
import { pageSpecFor } from "./page-specs";

function input(over: Record<string, unknown> = {}) {
  return {
    spec: pageSpecFor("FIVE_BY_SEVEN"),
    typographySlug: "classic-serif",
    completionIssues: [] as { step: string; message: string }[],
    overflows: [] as {
      field: string;
      requiredHeight: number;
      availableHeight: number;
    }[],
    images: [] as {
      assetId: string;
      width: number | null;
      height: number | null;
      boxWidthPt: number;
      boxHeightPt: number;
    }[],
    hasCover: true,
    backIsEmpty: false,
    ...over,
  };
}

describe("buildReport", () => {
  it("passes a complete invitation", () => {
    const report = buildReport(input());
    expect(report.blocking).toHaveLength(0);
    expect(report.canGenerate).toBe(true);
  });

  it("blocks on missing required fields", () => {
    const report = buildReport(
      input({ completionIssues: [{ step: "event", message: "Add a date." }] }),
    );
    expect(report.canGenerate).toBe(false);
    expect(report.blocking.some((i) => i.code === "missing-field")).toBe(true);
  });

  it("blocks on text overflow", () => {
    const report = buildReport(
      input({
        overflows: [
          {
            field: "invitationMessage",
            requiredHeight: 400,
            availableHeight: 100,
          },
        ],
      }),
    );
    expect(report.canGenerate).toBe(false);
    expect(report.blocking.some((i) => i.code === "text-overflow")).toBe(true);
  });

  it("blocks on an unmapped typography slug", () => {
    const report = buildReport(input({ typographySlug: "no-such-pairing" }));
    expect(report.blocking.some((i) => i.code === "missing-font")).toBe(true);
  });

  it("blocks an image below 200 DPI at its placement size", () => {
    // 360pt wide box = 5in; 300 DPI needs 1500px, 200 DPI needs 1000px.
    const report = buildReport(
      input({
        images: [
          {
            assetId: "a",
            width: 400,
            height: 400,
            boxWidthPt: 360,
            boxHeightPt: 360,
          },
        ],
      }),
    );
    expect(report.canGenerate).toBe(false);
    expect(report.blocking.some((i) => i.code === "low-resolution")).toBe(true);
  });

  it("warns, but allows, an image between 200 and 300 DPI", () => {
    const report = buildReport(
      input({
        images: [
          {
            assetId: "a",
            width: 1200,
            height: 1200,
            boxWidthPt: 360,
            boxHeightPt: 360,
          },
        ],
      }),
    );
    expect(report.canGenerate).toBe(true);
    expect(report.warnings.some((i) => i.code === "low-resolution")).toBe(true);
  });

  it("accepts an image at or above 300 DPI", () => {
    const report = buildReport(
      input({
        images: [
          {
            assetId: "a",
            width: 1500,
            height: 2100,
            boxWidthPt: 360,
            boxHeightPt: 504,
          },
        ],
      }),
    );
    expect(report.blocking).toHaveLength(0);
    expect(report.warnings.some((i) => i.code === "low-resolution")).toBe(false);
  });

  it("warns when there is no cover image, and when the back would be blank", () => {
    const report = buildReport(input({ hasCover: false, backIsEmpty: true }));
    expect(report.canGenerate).toBe(true);
    expect(report.warnings.some((i) => i.code === "no-cover")).toBe(true);
    expect(report.warnings.some((i) => i.code === "empty-back")).toBe(true);
  });

  it("treats unknown image dimensions as blocking rather than assuming they are fine", () => {
    const report = buildReport(
      input({
        images: [
          {
            assetId: "a",
            width: null,
            height: null,
            boxWidthPt: 360,
            boxHeightPt: 360,
          },
        ],
      }),
    );
    expect(report.canGenerate).toBe(false);
  });
});
