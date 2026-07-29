/**
 * The rules for retiring a catalogue template — pure, so they can be asserted
 * without a database.
 *
 * Two operations, and the difference between them is the whole point.
 *
 * Unpublishing is always safe and always reversible: the template leaves the
 * catalogue, nobody can choose it again, and every invitation already built on
 * it keeps its design. That is what `publishedAt` has always been for.
 *
 * Deleting is neither. `Invitation.templateId` is `onDelete: SetNull`, so a
 * delete will not take a customer's invitation with it — the schema says so
 * deliberately — but it does quietly strip that invitation's design, and the
 * customer finds out by looking at it. So a delete is offered only when no
 * invitation refers to the template at all.
 */

export interface TemplateUsage {
  /** Invitations whose design this is. The only figure that blocks a delete. */
  invitations: number;
  /** "Recently used" rows — analytics, cascade-deleted, harmless. */
  uses: number;
  /** Saved by customers. Also cascade-deleted. */
  favorites: number;
}

export type RemovalAction = "unpublish" | "delete";

export interface RemovalPlan {
  /** What the admin may do, safest first. */
  available: RemovalAction[];
  /** Why a delete is not offered, when it is not. Empty when it is. */
  blockedReason: string;
}

export function removalPlan(usage: TemplateUsage): RemovalPlan {
  if (usage.invitations > 0) {
    const noun = usage.invitations === 1 ? "invitation" : "invitations";
    return {
      available: ["unpublish"],
      blockedReason:
        `${usage.invitations} ${noun} ${usage.invitations === 1 ? "uses" : "use"} this design. ` +
        `Unpublishing hides it from the catalogue and leaves ${usage.invitations === 1 ? "it" : "them"} untouched.`,
    };
  }

  return { available: ["unpublish", "delete"], blockedReason: "" };
}

/** Whether a delete is permitted, for the action to re-check server-side. */
export function canDelete(usage: TemplateUsage): boolean {
  return removalPlan(usage).available.includes("delete");
}

/**
 * A URL-safe slug from a template name.
 *
 * Not reused from features/website-generator/slug.ts on purpose: that one
 * validates a slug a customer typed and refuses what it dislikes, which is
 * right for a public web address somebody has to remember. This one derives a
 * slug from a name an admin typed, so it corrects rather than refuses —
 * rejecting "Sampaguita & Lace" for containing an ampersand would be a form
 * arguing with the person filling it in.
 */
export function slugifyTemplateName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    // Strip accents so "Piña" becomes "pina" rather than "pi-a".
    .replace(/[̀-ͯ]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/** The next free slug, given the ones already taken. */
export function uniqueSlug(base: string, taken: Iterable<string>): string {
  const used = new Set(taken);
  const root = base || "template";
  if (!used.has(root)) return root;

  // Bounded rather than while(true): a runaway loop in an admin form is worse
  // than a suffix somebody has to look at.
  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${root}-${n}`;
    if (!used.has(candidate)) return candidate;
  }
  return `${root}-${Date.now()}`;
}

export interface NewTemplateInput {
  name: string;
  categoryId: string;
  shortDescription: string;
  description: string;
  designer: string;
}

export type NewTemplateErrors = Partial<Record<keyof NewTemplateInput, string>>;

/**
 * Validates the five things a Template genuinely needs from a person.
 *
 * The model requires more than this — version, tags, colours, styles,
 * features, orientation, tier — but every one of those has a sensible default
 * or is a facet the catalogue filters on and an empty list handles. Asking an
 * admin for eleven fields to add one design is how a form stops being used.
 */
export function validateNewTemplate(
  input: NewTemplateInput,
): NewTemplateErrors {
  const errors: NewTemplateErrors = {};

  if (!input.name.trim()) errors.name = "Give the template a name.";
  else if (input.name.trim().length > 80)
    errors.name = "Keep the name to 80 characters or fewer.";
  else if (!slugifyTemplateName(input.name))
    // "!!!" slugifies to nothing, which would leave a template with no address.
    errors.name = "Use at least one letter or number.";

  if (!input.categoryId) errors.categoryId = "Choose an occasion.";

  if (!input.shortDescription.trim())
    errors.shortDescription = "One line for the catalogue card.";
  else if (input.shortDescription.trim().length > 140)
    errors.shortDescription = "Keep this to 140 characters or fewer.";

  if (!input.description.trim())
    errors.description = "Describe the design for its own page.";

  if (!input.designer.trim()) errors.designer = "Who designed it?";

  return errors;
}
