/**
 * The seam that lets an invitation's structure vary by occasion.
 *
 * Until now the public invitation was one layout for all sixteen categories:
 * colour and wording changed, structure did not. FDG-ML-DEP-STD-015 asks the
 * opposite — each category with its own hero presentation and section ordering —
 * so structure becomes a value a template chooses rather than something baked
 * into the renderer.
 *
 * Deliberately data, not components. A layout is a description a renderer obeys,
 * which is what keeps sixteen occasions from becoming sixteen forks of the same
 * page (docs/invitation-design-language.md).
 */

/**
 * How the top of the invitation presents itself. This is the decision a guest
 * registers in the first second, so it is the one that most needs to differ
 * between a christening and a corporate gala.
 */
export type HeroPresentation =
  /** Photograph fills the viewport; type sits over a scrim. */
  | "full-bleed"
  /** A single portrait inside an arch, with generous margin around it. */
  | "arch-portrait"
  /** A wide band of photograph with the name set beneath it, editorial style. */
  | "photo-band"
  /** No photograph required: type, rules and ornament carry it. */
  | "type-led"
  /** Saturated flat colour behind heavy outlined display type. */
  | "flat-bold"
  /** A paper card floating over a photographic background — two planes. */
  | "card-on-photo"
  /** A grid of photographs where the crowd is the design. */
  | "photo-grid";

/**
 * Every section the invitation can render. The renderer walks a layout's
 * ordering rather than a fixed sequence, so a reunion can lead with its gallery
 * while a memorial never reaches one.
 */
export type SectionId =
  | "welcome"
  | "countdown"
  | "actions"
  | "invitation"
  | "hosts"
  | "parents"
  | "sponsors"
  | "venues"
  | "program"
  | "gallery"
  | "dress-code"
  | "gifts"
  | "notes"
  | "rsvp"
  | "closing"
  | "qr";

/** Corner decoration. Clusters at the edges; the centre stays clear for words. */
export type OrnamentMotif = "floral" | "filigree" | "wash" | "confetti" | "none";

/** The shape a photograph is cut to. A rectangle reads as pasted; a shape reads as placed. */
export type PhotoShape = "oval" | "arch" | "circle" | "blob" | "rect";

export interface InvitationLayout {
  /** Stable id, used in tests and eventually for a per-template override. */
  id: string;
  hero: HeroPresentation;
  /**
   * Section order. Sections absent from this list are never rendered for the
   * occasion, which is how a memorial avoids ever showing a gift registry.
   */
  sections: SectionId[];
  ornament: OrnamentMotif;
  photoShape: PhotoShape;
  /**
   * Whether the occasion takes confetti on opening. False is not an oversight
   * on memorial, religious and community — see event-site.tsx, which already
   * refuses to fire a party effect over a funeral notice.
   */
  celebratory: boolean;
}

/**
 * Sections every invitation ends with, in this order.
 *
 * QR last is a standing requirement (§7 of the earlier standard, restated in
 * Instructions 3): it must sit near the bottom of every design, so it is
 * appended rather than left to each layout to remember.
 */
export const TAIL_SECTIONS: SectionId[] = ["rsvp", "closing", "qr"];

/** A layout's full ordering, with the shared tail appended once. */
export function sectionOrder(layout: InvitationLayout): SectionId[] {
  const tail = TAIL_SECTIONS.filter((s) => !layout.sections.includes(s));
  return [...layout.sections, ...tail];
}
