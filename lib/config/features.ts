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
  /** Ph3 — Invitation Builder */
  get invitationBuilder() {
    return flag("NEXT_PUBLIC_FEATURE_INVITATION_BUILDER");
  },
  /** Ph4 — Media Library */
  get mediaLibrary() {
    return flag("NEXT_PUBLIC_FEATURE_MEDIA_LIBRARY");
  },
  /** Ph6 — PDF Generation */
  get pdfGeneration() {
    return flag("NEXT_PUBLIC_FEATURE_PDF_GENERATION");
  },
  /** Ph7 — Booking */
  get booking() {
    return flag("NEXT_PUBLIC_FEATURE_BOOKING");
  },
  /** Ph8 — Payments */
  get payments() {
    return flag("NEXT_PUBLIC_FEATURE_PAYMENTS");
  },
  /** Allow self-service registration. On by default; a kill switch, not a phase gate. */
  get registration() {
    return flag("NEXT_PUBLIC_FEATURE_REGISTRATION", true);
  },
} as const;
