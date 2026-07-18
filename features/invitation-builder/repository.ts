import "server-only";

import { cache } from "react";
import type { Prisma } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { CompletenessSnapshot } from "./completeness";

/**
 * Invitation reads — Ph3.md §11, §12.
 *
 * The only module that queries invitation tables. Every function takes a
 * profileId and scopes on it: ownership is enforced in the WHERE clause, not by
 * a check after the fact, so there is no path that loads someone else's
 * invitation and then decides what to do about it.
 */

/** Everything the builder needs to render any step. One query. */
const FULL_INCLUDE = {
  template: {
    select: {
      id: true,
      slug: true,
      name: true,
      coverImageUrl: true,
      orientation: true,
    },
  },
  hosts: { orderBy: { sortOrder: "asc" } },
  venues: { orderBy: { sortOrder: "asc" } },
  content: true,
  people: { orderBy: [{ group: "asc" }, { sortOrder: "asc" }] },
  program: { orderBy: { sortOrder: "asc" } },
  personalization: true,
  media: {
    orderBy: { sortOrder: "asc" },
    include: {
      asset: {
        select: {
          id: true,
          bucket: true,
          storagePath: true,
          altText: true,
          originalFilename: true,
          version: true,
          width: true,
        },
      },
    },
  },
} satisfies Prisma.InvitationInclude;

/**
 * The draft as loaded, relations and all.
 *
 * `GetPayload` rather than inferring from the call: the inferred version loses
 * the includes and silently degrades to the bare row, so every relation access
 * becomes a type error at the call site instead of here.
 */
export type InvitationDraft = Prisma.InvitationGetPayload<{
  include: typeof FULL_INCLUDE;
}>;

/**
 * One invitation, by id, for its owner.
 *
 * `cache`d so a layout, a page, and the preview can each ask without three
 * round trips in one render.
 */
export const getDraft = cache(
  async (
    profileId: string,
    invitationId: string,
  ): Promise<InvitationDraft | null> => {
    if (!isDatabaseConfigured()) return null;

    try {
      return await prisma.invitation.findFirst({
        // profileId in the WHERE, not an `if` afterwards. This is the
        // authorisation check.
        where: { id: invitationId, profileId },
        include: FULL_INCLUDE,
      });
    } catch (error) {
      logger.report(error, { at: "getDraft", invitationId });
      return null;
    }
  },
);

/** A customer's drafts — Ph3.md §11. */
export async function listDrafts(profileId: string) {
  if (!isDatabaseConfigured()) return [];

  try {
    return await prisma.invitation.findMany({
      where: { profileId, status: { in: ["DRAFT", "COMPLETED"] } },
      // Most recently touched first: the one you were working on is the one you
      // came back for.
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        currentStep: true,
        eventTitle: true,
        eventDate: true,
        eventType: true,
        updatedAt: true,
        completedAt: true,
        templateId: true,
        template: { select: { name: true, coverImageUrl: true } },
        _count: { select: { hosts: true, venues: true } },
      },
    });
  } catch (error) {
    logger.report(error, { at: "listDrafts", profileId });
    return [];
  }
}

/** The snapshot completeness.ts needs, without loading the whole draft. */
export function snapshotOf(draft: {
  templateId: string | null;
  eventTitle: string | null;
  eventDate: Date | null;
  hosts: unknown[];
  venues: unknown[];
}): CompletenessSnapshot {
  return {
    templateId: draft.templateId,
    eventTitle: draft.eventTitle,
    eventDate: draft.eventDate,
    hostCount: draft.hosts.length,
    venueCount: draft.venues.length,
  };
}

/** Same, from a list row where counts are aggregated rather than loaded. */
export function snapshotOfListRow(row: {
  templateId: string | null;
  eventTitle: string | null;
  eventDate: Date | null;
  _count: { hosts: number; venues: number };
}): CompletenessSnapshot {
  return {
    templateId: row.templateId,
    eventTitle: row.eventTitle,
    eventDate: row.eventDate,
    hostCount: row._count.hosts,
    venueCount: row._count.venues,
  };
}

/** Assert ownership before a write. Returns the id, or null. */
export async function assertOwnership(
  profileId: string,
  invitationId: string,
): Promise<string | null> {
  if (!isDatabaseConfigured()) return null;

  try {
    const found = await prisma.invitation.findFirst({
      where: { id: invitationId, profileId },
      select: { id: true },
    });
    return found?.id ?? null;
  } catch (error) {
    logger.report(error, { at: "assertOwnership", invitationId });
    return null;
  }
}
