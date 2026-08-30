import "server-only";

import { isDatabaseConfigured, prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

const SOURCES = new Set(["home-hero", "home-closing"]);

export async function recordHomepageCta(source: string) {
  if (!SOURCES.has(source) || !isDatabaseConfigured()) return;
  try {
    await prisma.acquisitionEvent.create({
      data: { type: "HOMEPAGE_CTA", source, target: "/templates" },
    });
  } catch (error) {
    logger.report(error, { at: "recordHomepageCta", source });
  }
}
