import type { Prisma } from "@prisma/client";
import type { MediaCriteria, MediaSort } from "./criteria";

/**
 * Criteria → Prisma query for MediaAsset — mirrors
 * features/template-marketplace/query.ts. Pure, so the whole filter and sort
 * surface is unit-testable without a database.
 */

const KIND_MAP: Record<string, "IMAGE" | "DOCUMENT" | "AUDIO" | "VIDEO"> = {
  image: "IMAGE",
  document: "DOCUMENT",
  audio: "AUDIO",
  video: "VIDEO",
};

function searchClause(q: string): Prisma.MediaAssetWhereInput {
  const terms = q.split(/\s+/).filter(Boolean);

  return {
    AND: terms.map((term) => ({
      OR: [
        { originalFilename: { contains: term, mode: "insensitive" } },
        { altText: { contains: term, mode: "insensitive" } },
        // Array column — a tag is already an atom, matched whole, hence the
        // explicit lowercase (has is case-sensitive). Same reasoning as
        // template-marketplace/query.ts's tag/color/style clauses.
        { tags: { has: term.toLowerCase() } },
      ],
    })),
  };
}

export interface BuildMediaWhereOptions {
  profileId: string;
}

export function buildMediaWhere(
  criteria: MediaCriteria,
  { profileId }: BuildMediaWhereOptions,
): Prisma.MediaAssetWhereInput {
  const and: Prisma.MediaAssetWhereInput[] = [{ profileId }];

  if (criteria.q) and.push(searchClause(criteria.q));

  if (criteria.kind.length > 0) {
    and.push({ kind: { in: criteria.kind.map((k) => KIND_MAP[k]) } });
  }

  if (criteria.tag.length > 0) {
    and.push({ tags: { hasSome: criteria.tag } });
  }

  if (criteria.event === "unsorted") {
    and.push({ usages: { none: {} } });
  } else if (criteria.event) {
    and.push({ usages: { some: { invitationId: criteria.event } } });
  }

  return { AND: and };
}

/** Every branch ends with `id` as a unique tiebreaker — same reasoning as buildOrderBy in template-marketplace/query.ts. */
export function buildMediaOrderBy(
  sort: MediaSort,
): Prisma.MediaAssetOrderByWithRelationInput[] {
  switch (sort) {
    case "oldest":
      return [{ createdAt: "asc" }, { id: "asc" }];
    case "largest":
      return [{ bytes: "desc" }, { id: "asc" }];
    case "name":
      return [{ originalFilename: "asc" }, { id: "asc" }];
    case "newest":
    default:
      return [{ createdAt: "desc" }, { id: "asc" }];
  }
}

export function buildMediaPagination(criteria: MediaCriteria): {
  skip: number;
  take: number;
} {
  return {
    skip: (criteria.page - 1) * criteria.perPage,
    take: criteria.perPage,
  };
}
