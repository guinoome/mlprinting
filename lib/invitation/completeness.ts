import { BUILDER_STEPS } from "@/features/invitation-builder/steps";

/**
 * Is this invitation finishable? — Ph3.md §9, and the §Success Criteria's
 * "Finish the invitation and proceed to the next stage".
 *
 * Separate from schema.ts on purpose, and the separation is what makes autosave
 * possible (§8). Two different questions get asked at two different times:
 *
 *   schema.ts      "Is this value legal?"        — on every save, mid-typing.
 *   completeness   "Is this invitation done?"    — only when finishing.
 *
 * Collapsing them would mean refusing to autosave a draft that is missing a
 * venue, which is every draft, five seconds in.
 *
 * Pure and Prisma-free: takes a plain snapshot so it runs on the server before
 * completing, and on the client to light up the step nav, from one definition.
 */

/** The minimum an invitation needs, shaped to what a step owns. */
export interface CompletenessSnapshot {
  templateId: string | null;
  eventTitle: string | null;
  eventDate: Date | null;
  hostCount: number;
  venueCount: number;
}

export interface StepIssue {
  step: string;
  message: string;
}

/**
 * What is missing, per step.
 *
 * Returns issues rather than a boolean so the UI can point at the step that
 * needs attention. "Cannot finish" with no reason is a dead end.
 */
export function completionErrors(snapshot: CompletenessSnapshot): StepIssue[] {
  const issues: StepIssue[] = [];

  if (!snapshot.templateId) {
    issues.push({ step: "template", message: "Choose a template." });
  }

  if (!snapshot.eventTitle?.trim()) {
    issues.push({ step: "event", message: "Add a title for the event." });
  }

  if (!snapshot.eventDate) {
    issues.push({ step: "event", message: "Add the event date." });
  }

  if (snapshot.hostCount === 0) {
    issues.push({
      step: "hosts",
      message: "Add at least one host or celebrant.",
    });
  }

  if (snapshot.venueCount === 0) {
    issues.push({ step: "venue", message: "Add at least one venue." });
  }

  return issues;
}

export function isComplete(snapshot: CompletenessSnapshot): boolean {
  return completionErrors(snapshot).length === 0;
}

/**
 * Which steps have outstanding issues — for ticks in the step nav.
 *
 * A step with no requirements (Media, Preview) is never "incomplete", because
 * it cannot be: it has nothing to be missing. Marking optional steps with a
 * warning would teach customers to ignore the warnings.
 */
export function incompleteSteps(snapshot: CompletenessSnapshot): Set<string> {
  return new Set(completionErrors(snapshot).map((issue) => issue.step));
}

/** How far along, 0–100. Counts required steps only — optional ones are not progress. */
export function completionPercent(snapshot: CompletenessSnapshot): number {
  const required = BUILDER_STEPS.filter((step) => step.required);
  const blocked = incompleteSteps(snapshot);
  const done = required.filter((step) => !blocked.has(step.slug)).length;

  return Math.round((done / required.length) * 100);
}
