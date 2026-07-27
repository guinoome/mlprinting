import type { EventKind } from "@/lib/invitation/preview-model";
import type { InvitationLayout } from "./types";

/**
 * One layout per occasion, from the direction table in
 * docs/invitation-design-language.md.
 *
 * The brief's instruction is "avoid sharing the same layout across categories",
 * so these are written to differ in hero, ordering and ornament rather than in
 * colour alone — colour already varies, and varying only colour is exactly the
 * cloning the brief warns against. registry.test.ts enforces that as a rule
 * instead of leaving it to good intentions.
 *
 * Ordering is the quiet half of the work. What a guest sees second, after the
 * hero, is what the occasion is actually about: a reunion opens on its gallery,
 * a fiesta on its programme, a memorial on the words.
 */
export const LAYOUTS: Record<EventKind, InvitationLayout> = {
  wedding: {
    id: "wedding-editorial",
    hero: "full-bleed",
    sections: ["welcome", "countdown", "actions", "hosts", "invitation", "parents", "sponsors", "venues", "program", "gallery", "dress-code", "gifts"],
    ornament: "floral",
    photoShape: "arch",
    celebratory: true,
  },
  engagement: {
    id: "engagement-arch",
    hero: "arch-portrait",
    sections: ["welcome", "hosts", "invitation", "countdown", "actions", "venues", "gallery", "notes"],
    ornament: "floral",
    photoShape: "arch",
    celebratory: true,
  },
  debut: {
    id: "debut-metallic",
    hero: "type-led",
    sections: ["welcome", "hosts", "countdown", "invitation", "sponsors", "venues", "program", "dress-code", "gallery", "actions"],
    ornament: "filigree",
    photoShape: "oval",
    celebratory: true,
  },
  birthday: {
    id: "birthday-bold",
    hero: "flat-bold",
    // Where and when come before the prose. Most people opening a birthday
    // invitation are deciding whether they can get a child across town on a
    // Saturday afternoon, and the warm paragraph is not what answers that.
    sections: ["welcome", "countdown", "venues", "program", "actions", "invitation", "gallery", "gifts"],
    ornament: "confetti",
    photoShape: "circle",
    celebratory: true,
  },
  christening: {
    id: "christening-soft",
    hero: "arch-portrait",
    sections: ["welcome", "hosts", "parents", "sponsors", "invitation", "venues", "program", "countdown", "gallery"],
    ornament: "wash",
    photoShape: "blob",
    celebratory: true,
  },
  "baby-shower": {
    id: "baby-shower-wash",
    hero: "card-on-photo",
    sections: ["welcome", "hosts", "invitation", "countdown", "actions", "venues", "gifts", "gallery", "notes"],
    ornament: "wash",
    photoShape: "arch",
    celebratory: true,
  },
  anniversary: {
    id: "anniversary-then-now",
    hero: "photo-band",
    sections: ["welcome", "hosts", "countdown", "invitation", "gallery", "venues", "program", "dress-code"],
    ornament: "filigree",
    photoShape: "oval",
    celebratory: true,
  },
  graduation: {
    id: "graduation-editorial",
    hero: "photo-band",
    sections: ["welcome", "hosts", "invitation", "countdown", "actions", "venues", "program", "gallery"],
    ornament: "none",
    photoShape: "rect",
    celebratory: true,
  },
  corporate: {
    id: "corporate-deco",
    hero: "type-led",
    sections: ["welcome", "invitation", "countdown", "venues", "program", "dress-code", "actions", "notes"],
    ornament: "filigree",
    photoShape: "rect",
    celebratory: true,
  },
  reunion: {
    id: "reunion-grid",
    hero: "photo-grid",
    sections: ["welcome", "gallery", "hosts", "invitation", "countdown", "venues", "program", "actions"],
    ornament: "none",
    photoShape: "rect",
    celebratory: true,
  },
  family: {
    id: "family-table",
    hero: "card-on-photo",
    sections: ["welcome", "hosts", "invitation", "venues", "program", "countdown", "gallery", "notes", "actions"],
    ornament: "wash",
    photoShape: "blob",
    celebratory: true,
  },
  fiesta: {
    id: "fiesta-banderitas",
    hero: "flat-bold",
    sections: ["welcome", "program", "invitation", "venues", "countdown", "gallery", "notes", "actions"],
    ornament: "confetti",
    photoShape: "circle",
    celebratory: true,
  },
  religious: {
    id: "religious-quiet",
    hero: "type-led",
    sections: ["welcome", "invitation", "program", "venues", "hosts", "notes"],
    ornament: "none",
    photoShape: "rect",
    celebratory: false,
  },
  community: {
    id: "community-notice",
    hero: "type-led",
    sections: ["welcome", "invitation", "program", "venues", "notes", "actions"],
    ornament: "none",
    photoShape: "rect",
    celebratory: false,
  },
  /**
   * The quietest of the set: one portrait, wide margin, nothing that reads as
   * festive. It is the only layout with no countdown — counting down to a
   * funeral is the sort of thing a system does when nobody thought about it.
   */
  funeral: {
    id: "memorial-still",
    hero: "arch-portrait",
    // Service details before everything but the opening line. Someone reading a
    // memorial notice is working out where the wake is and when the mass is, and
    // making them scroll past a family biography to find it is the wrong
    // priority on the one invitation where getting it wrong matters most.
    sections: ["welcome", "invitation", "venues", "program", "hosts", "gallery", "notes", "gifts"],
    ornament: "none",
    photoShape: "oval",
    celebratory: false,
  },
  general: {
    id: "custom-neutral",
    hero: "full-bleed",
    sections: ["welcome", "invitation", "countdown", "actions", "hosts", "venues", "program", "gallery", "dress-code", "gifts", "notes"],
    ornament: "none",
    photoShape: "rect",
    celebratory: true,
  },
};

export function layoutFor(kind: EventKind): InvitationLayout {
  return LAYOUTS[kind] ?? LAYOUTS.general;
}
