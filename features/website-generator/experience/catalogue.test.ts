import { describe, expect, it } from "vitest";
import { TEMPLATES } from "@/prisma/seed-data";
import {
  CATALOGUE_ACTION_SLUGS,
  DESIGN_EVOLUTION_MATRIX,
  catalogueMetadataFor,
} from "./catalogue";
describe("design evolution catalogue", () => {
  it("defines the complete published 50-design matrix", () => {
    expect(DESIGN_EVOLUTION_MATRIX).toHaveLength(50);
    expect(new Set(DESIGN_EVOLUTION_MATRIX.map((row) => row.slug)).size).toBe(
      50,
    );
  });
  it("keeps actions exhaustive as templates change", () => {
    expect([...CATALOGUE_ACTION_SLUGS].sort()).toEqual(
      TEMPLATES.map((template) => template.slug).sort(),
    );
  });
  it("populates every required metadata field", () => {
    for (const row of DESIGN_EVOLUTION_MATRIX) {
      expect(row.name).toBeTruthy();
      expect(row.experienceFamily).toBeTruthy();
      expect(row.eventCompatibility.length).toBeGreaterThan(0);
      expect(row.visualIdentity).toBeTruthy();
      expect(row.layoutProfile).toBeTruthy();
      expect(row.motionProfile).toBeTruthy();
      expect(row.interactionProfile.length).toBeGreaterThan(0);
      expect(row.mediaTreatment).toBeTruthy();
      expect(row.digitalPrintCompatibility).toBeTruthy();
      expect(row.commercialTier).toBeTruthy();
      expect(row.performanceClass).toBeTruthy();
      expect(row.motionLevel).toMatch(/^M[2-4]$/);
      expect(row.experienceSignature).toBeTruthy();
      expect(row.action).toBeTruthy();
    }
  });
  it("excludes unpublished fixtures but still governs their disposition", () => {
    const draft = TEMPLATES.find((template) => template.publishedDaysAgo < 0)!;
    expect(DESIGN_EVOLUTION_MATRIX.some((row) => row.slug === draft.slug)).toBe(
      false,
    );
    expect(catalogueMetadataFor(draft).action).toBe("RETIRE");
  });
});
