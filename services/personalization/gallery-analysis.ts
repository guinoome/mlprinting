export interface PersonalizationCandidate {
  id: string;
  originalFilename: string;
  tags: string[];
  width?: number | null;
  height?: number | null;
}

export interface RankedPersonalizationCandidate {
  asset: PersonalizationCandidate;
  score: number;
  reasons: string[];
  /** A suggestion is never consent; the customer must still choose the cover. */
  confirmationRequired: true;
}

/**
 * Rank only assets already assigned to the current invitation.
 *
 * This is deliberately modest: filenames, customer tags, and dimensions are
 * useful selection hints, not face recognition. It cannot establish identity
 * and therefore never auto-approves a photograph.
 */
export function rankPersonalizationCandidates(
  assets: readonly PersonalizationCandidate[],
  invitationAssetIds: ReadonlySet<string>,
): RankedPersonalizationCandidate[] {
  return assets
    .filter((asset) => invitationAssetIds.has(asset.id))
    .map((asset) => {
      let score = 0;
      const reasons: string[] = [];
      const text =
        `${asset.originalFilename} ${asset.tags.join(" ")}`.toLowerCase();

      if (/celebrant|birthday|child|kid|portrait/.test(text)) {
        score += 6;
        reasons.push("labelled as a likely celebrant portrait");
      }
      if (asset.width && asset.height && asset.height > asset.width) {
        score += 3;
        reasons.push("portrait orientation suits the hero");
      }
      if (
        asset.width &&
        asset.height &&
        Math.min(asset.width, asset.height) >= 900
      ) {
        score += 2;
        reasons.push("high enough resolution for a full-screen invitation");
      }
      if (reasons.length === 0)
        reasons.push("already assigned to this invitation");

      return { asset, score, reasons, confirmationRequired: true as const };
    })
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.asset.originalFilename.localeCompare(b.asset.originalFilename),
    );
}
