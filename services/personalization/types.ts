/**
 * Replaceable personalization boundary for approved, build-time composites.
 *
 * Providers receive storage references scoped to one invitation, never a
 * profile-wide photo library. The direct renderer ships first; a future hosted
 * identity-preserving provider can implement this contract without changing
 * invitation data or public rendering. The template policy is authoritative
 * for required identity preservation and scene integration; this interface
 * deliberately does not pretend that a provider exists before one is vetted.
 */
export interface PersonalizationRequest {
  profileId: string;
  invitationId: string;
  templateId: string;
  sourceAssetId: string;
  sourceVersion: number;
  consentConfirmed: boolean;
}

export interface PersonalizationArtifact {
  provider: string;
  invitationId: string;
  templateId: string;
  sourceAssetId: string;
  sourceVersion: number;
  storagePath: string;
  createdAt: Date;
}

export interface PersonalizationProvider {
  readonly id: string;
  createApprovedComposite(
    request: PersonalizationRequest,
  ): Promise<PersonalizationArtifact>;
}
