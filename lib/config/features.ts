/**
 * Feature flags — Ph1.md §10.
 *
 * Each flag names the phase that turns it on. Phase 1 ships the framework with
 * every business capability dark, which is what lets later phases land
 * incrementally instead of in one unreviewable drop.
 *
 * Flags are read at call time, never destructured at module load, so an env
 * override applies without a rebuild of the importing module.
 */

function flag(name: string, fallback = false): boolean {
  const value = process.env[name];
  if (value === undefined) return fallback;
  return value === "true" || value === "1";
}

export const features = {
  /**
   * Ph2 — Template Marketplace. Shipped, so this defaults on: it is now a kill
   * switch (set the env var to "false" to close the marketplace), not a phase
   * gate. A shipped feature that still defaults off is a feature nobody sees.
   */
  get templateMarketplace() {
    return flag("NEXT_PUBLIC_FEATURE_TEMPLATE_MARKETPLACE", true);
  },
  /**
   * Ph3 — Guided Invitation Builder. Shipped, so this defaults on and is now a
   * kill switch rather than a phase gate.
   */
  get invitationBuilder() {
    return flag("NEXT_PUBLIC_FEATURE_INVITATION_BUILDER", true);
  },
  /**
   * Ph4 — Media Library. Shipped, so this defaults on and is now a kill switch.
   * Every storage call guards on `isSupabaseConfigured()` and degrades to empty,
   * so turning it on where storage is unwired shows the UI without crashing.
   */
  get mediaLibrary() {
    return flag("NEXT_PUBLIC_FEATURE_MEDIA_LIBRARY", true);
  },
  /** Ph6 — PDF Generation. Shipped, so this defaults on (kill switch); pdf-lib needs no external infra. */
  get pdfGeneration() {
    return flag("NEXT_PUBLIC_FEATURE_PDF_GENERATION", true);
  },
  /** Ph7 — Booking / Orders. Shipped, so this defaults on (kill switch); needs only the database. */
  get booking() {
    return flag("NEXT_PUBLIC_FEATURE_BOOKING", true);
  },
  /**
   * Ph8 — Payments. Still a phase gate: default off until the phase ships. This
   * is the one capability deliberately left dark.
   */
  get payments() {
    return flag("NEXT_PUBLIC_FEATURE_PAYMENTS");
  },
  /** Ph5 — Website Generator. Shipped, so this defaults on (kill switch); public event pages need only the database. */
  get websiteGenerator() {
    return flag("NEXT_PUBLIC_FEATURE_WEBSITE_GENERATOR", true);
  },
  /** Allow self-service registration. On by default; a kill switch, not a phase gate. */
  get registration() {
    return flag("NEXT_PUBLIC_FEATURE_REGISTRATION", true);
  },
} as const;
