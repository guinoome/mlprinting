/**
 * Storage layout for generated print files.
 *
 * The profile id leads, exactly as services/media/paths.ts does, because that
 * prefix is what Supabase storage policies match on — an object filed under
 * someone else's prefix is an authorization hole no route check can close.
 *
 * The generation id, not the version number, names the object: rows are
 * append-only, so an object written once is never rewritten and its bytes can
 * be cached forever.
 */
export function pdfObjectPath(
  profileId: string,
  invitationId: string,
  generationId: string,
): string {
  return `${profileId}/print/${invitationId}/${generationId}.pdf`;
}
