/**
 * Public website slug validation — design doc Decision 1 (customer-chosen
 * slug, doubling as the access-control boundary alongside `isPublished`).
 * Pure: no Prisma. Uniqueness is a repository concern (Task 6); this only
 * decides whether a candidate string is well-formed.
 */

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MIN_LENGTH = 3;
const MAX_LENGTH = 60;

export interface SlugValidationFailure {
  code: "too-short" | "too-long" | "invalid-characters";
  message: string;
}

/** A courtesy normalisation before validation, not a silent correction of shape. */
export function normalizeSlug(input: string): string {
  return input.trim().toLowerCase();
}

export function validateSlug(candidate: string): SlugValidationFailure | null {
  if (candidate.length < MIN_LENGTH) {
    return {
      code: "too-short",
      message: `Must be at least ${MIN_LENGTH} characters.`,
    };
  }

  if (candidate.length > MAX_LENGTH) {
    return {
      code: "too-long",
      message: `Must be ${MAX_LENGTH} characters or fewer.`,
    };
  }

  if (!SLUG_PATTERN.test(candidate)) {
    return {
      code: "invalid-characters",
      message:
        "Use lowercase letters, numbers, and hyphens only — no leading, trailing, or doubled hyphens.",
    };
  }

  return null;
}
