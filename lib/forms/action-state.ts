/**
 * The shape a Server Action returns to a form.
 *
 * Lives in lib/ because three features now use it (auth, account,
 * invitation-builder) and a shared type has no business living inside any one
 * of them. It was in features/auth until Phase 3 — see docs/folder-structure.md.
 *
 * Framework-free on purpose: this is a data shape, and putting it in lib/ keeps
 * it importable from a Server Action and a Client Component alike.
 */
export interface ActionState {
  /** A message for the whole submission — shown, not thrown. */
  error?: string;
  /**
   * Per-field messages, keyed by input name.
   *
   * Nested list fields use a dotted path — `hosts.0.displayName` — so an error
   * lands on the input that caused it rather than on the list.
   */
  fieldErrors?: Record<string, string>;
  /** A non-error outcome, e.g. "check your inbox". */
  message?: string;
}

/**
 * Flatten Zod issues into field errors.
 *
 * Keeps the first message per field: a stack of messages on one input is noise,
 * and the customer fixes one thing at a time.
 */
export function fieldErrorsFrom(
  issues: { path: PropertyKey[]; message: string }[],
): Record<string, string> {
  const fieldErrors: Record<string, string> = {};

  for (const issue of issues) {
    const key = issue.path.map(String).join(".");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}
