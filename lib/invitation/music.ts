/**
 * Background music for invitation templates.
 *
 * Five moods rather than one track per event kind, because the useful
 * distinction is tone, not occasion: an engagement and an anniversary want the
 * same thing from music. The tracks themselves are generated and committed by
 * `scripts/generate-invitation-music.mjs`.
 *
 * Pure and framework-free: this maps a kind to a path and nothing more, so the
 * builder preview, the published site and the tests can all agree on the answer
 * without any of them reaching a database.
 */

export type MusicMood =
  "romantic" | "cinematic" | "playful" | "magical" | "celebratory";

/** Served from `public/`, so these are request paths, not filesystem paths. */
export const MUSIC_TRACKS: Record<MusicMood, string> = {
  romantic: "/music/romantic.wav",
  cinematic: "/music/cinematic.wav",
  playful: "/music/playful.wav",
  magical: "/music/magical.wav",
  celebratory: "/music/celebratory.wav",
};

/**
 * Keyed by event kind slug, mirroring TemplateCategory.slug.
 *
 * Grouped by tone rather than sorted, and funeral is why. A memorial
 * invitation shares an audience and a register with corporate and religious
 * events — restrained, unhurried, no bounce — so it belongs with cinematic. If
 * this list were alphabetical or if unlisted kinds simply fell through to the
 * default, funeral would land on playful or celebratory, and a bereaved family
 * would open the page to party music. That failure is not recoverable by an
 * apology, so the mapping is explicit and this entry is deliberate.
 */
const MOOD_BY_EVENT_KIND: Record<string, MusicMood> = {
  wedding: "romantic",
  engagement: "romantic",
  anniversary: "romantic",

  corporate: "cinematic",
  funeral: "cinematic",
  religious: "cinematic",

  birthday: "playful",
  family: "playful",
  fiesta: "playful",

  christening: "magical",
  "baby-shower": "magical",

  debut: "celebratory",
  graduation: "celebratory",
  reunion: "celebratory",
  community: "celebratory",
  general: "celebratory",
};

/**
 * The mood for an event kind, defaulting to celebratory.
 *
 * Unknown kinds get a default rather than nothing, because a template with no
 * music is a worse outcome than a template with approximately right music, and
 * `Invitation.eventType` accepts kinds this list has not seen yet.
 */
export function moodForEventKind(kind: string): MusicMood {
  return MOOD_BY_EVENT_KIND[kind.trim().toLowerCase()] ?? "celebratory";
}
