/**
 * Display labels for facet slugs.
 *
 * Slugs are lowercase because the database matches array columns
 * case-sensitively (see query.ts). Rendering them with CSS `capitalize` gets
 * most words right and acronyms wrong — "rsvp" becomes "Rsvp".
 *
 * Only exceptions live here. Anything absent falls back to capitalising the
 * slug, so a new tag needs no entry unless it looks wrong without one — which
 * keeps this from becoming a translation table nobody maintains.
 */
const EXCEPTIONS: Record<string, string> = {
  rsvp: "RSVP",
  qr: "QR",
  pdf: "PDF",
  faq: "FAQ",
};

export function facetLabel(slug: string): string {
  const exception = EXCEPTIONS[slug.toLowerCase()];
  if (exception) return exception;

  // Handles multi-word slugs too: "save-the-date" → "Save the date".
  const words = slug.split(/[-_\s]+/).filter(Boolean);
  if (words.length === 0) return slug;

  return words
    .map((word, index) => {
      const known = EXCEPTIONS[word.toLowerCase()];
      if (known) return known;
      // Sentence case, not title case: only the first word is capitalised.
      return index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word;
    })
    .join(" ");
}
