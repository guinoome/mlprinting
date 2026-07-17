/**
 * The builder workflow — Ph3.md §1.
 *
 * The spec calls its ten steps a "suggested workflow" and requires that the
 * workflow "support future steps without redesign". So the steps are data: this
 * array is the single source of truth for the order, the URLs, the labels, and
 * which steps are required. Adding a step is an entry here plus a form
 * component — the nav, the progress bar, the resume logic, and the completion
 * check all read from this and need no changes.
 *
 * Two of the spec's ten steps are deliberately not in this list:
 *
 *   "Save Draft" is not a step. Ph3.md §8 requires autosave, and a workflow that
 *   asks you to visit a Save screen has not autosaved. It is a control on every
 *   step instead.
 *
 *   "Continue to Order" is not a step either. It is the exit — the order flow is
 *   Ph7, and Ph3.md's Out of Scope forbids building it. It is the button at the
 *   end of Preview.
 *
 * Pure data, no React, no Prisma: the step registry is imported by the server
 * (to decide what to validate) and the client (to render the nav), so it must
 * be safe in both.
 */

export interface BuilderStep {
  /** URL segment and the value stored in Invitation.currentStep. */
  slug: string;
  /** Nav label. Short — it sits in a sidebar. */
  label: string;
  /** One line under the step heading, framing the question being asked. */
  description: string;
  /**
   * Whether the invitation is incomplete without this step.
   *
   * Optional steps still appear in the nav: a customer who skips Media should
   * see that they skipped it, not have it hidden from them.
   */
  required: boolean;
}

/** Ph3.md §1, in order. */
export const BUILDER_STEPS: BuilderStep[] = [
  {
    slug: "template",
    label: "Template",
    description: "Choose the design your invitation is built on.",
    required: true,
  },
  {
    slug: "event",
    label: "Event",
    description: "The basics: what the event is, and when.",
    required: true,
  },
  {
    slug: "hosts",
    label: "Hosts",
    description: "Who is celebrating. Add one, or as many as you need.",
    required: true,
  },
  {
    slug: "venue",
    label: "Schedule & venue",
    description: "Where it happens, and at what time.",
    required: true,
  },
  {
    slug: "content",
    label: "Invitation content",
    description: "The words on the invitation.",
    required: false,
  },
  {
    slug: "media",
    label: "Media",
    description: "Photos for the cover and the gallery.",
    required: false,
  },
  {
    slug: "personalize",
    label: "Theme & style",
    description: "Colour, type, and what to show.",
    required: false,
  },
  {
    slug: "preview",
    label: "Preview",
    description: "See it as your guests will, then finish.",
    required: false,
  },
];

export const FIRST_STEP = BUILDER_STEPS[0]!.slug;
export const LAST_STEP = BUILDER_STEPS[BUILDER_STEPS.length - 1]!.slug;

const BY_SLUG = new Map(BUILDER_STEPS.map((step) => [step.slug, step]));

export function isBuilderStep(slug: string): boolean {
  return BY_SLUG.has(slug);
}

export function getStep(slug: string): BuilderStep | undefined {
  return BY_SLUG.get(slug);
}

/** 1-based position, for "Step 3 of 8". Returns 0 for an unknown slug. */
export function stepNumber(slug: string): number {
  return BUILDER_STEPS.findIndex((step) => step.slug === slug) + 1;
}

export function nextStep(slug: string): string | null {
  const index = BUILDER_STEPS.findIndex((step) => step.slug === slug);
  if (index < 0 || index >= BUILDER_STEPS.length - 1) return null;
  return BUILDER_STEPS[index + 1]!.slug;
}

export function previousStep(slug: string): string | null {
  const index = BUILDER_STEPS.findIndex((step) => step.slug === slug);
  if (index <= 0) return null;
  return BUILDER_STEPS[index - 1]!.slug;
}

/**
 * Resolve a step slug from an untrusted source (a URL, or a stale
 * `currentStep` written before a step was renamed).
 *
 * Falls back to the first step rather than 404ing: a customer returning to a
 * draft whose step no longer exists should land at the start of their own work,
 * not on an error page.
 */
export function resolveStep(slug: string | undefined | null): string {
  if (slug && isBuilderStep(slug)) return slug;
  return FIRST_STEP;
}

export const REQUIRED_STEPS = BUILDER_STEPS.filter((step) => step.required).map(
  (step) => step.slug,
);
