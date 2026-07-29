import "server-only";

import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { placeholderUrl } from "@/lib/placeholder-art";
import {
  canDelete,
  removalPlan,
  slugifyTemplateName,
  uniqueSlug,
  type NewTemplateInput,
  type RemovalPlan,
  type TemplateUsage,
} from "./catalogue";

/**
 * Catalogue reads and writes for the admin — Instructions 4, extended.
 *
 * The usage counts are the point of the list query. An admin deciding whether
 * to retire a design needs to know who is standing on it before they act, and
 * fetching that per row on demand would make the page a fan of queries.
 */

export interface CatalogueRow {
  id: string;
  slug: string;
  name: string;
  categoryName: string;
  coverImageUrl: string;
  publishedAt: Date | null;
  isFeatured: boolean;
  usage: TemplateUsage;
  removal: RemovalPlan;
}

export async function listCatalogue(): Promise<CatalogueRow[]> {
  try {
    const templates = await prisma.template.findMany({
      select: {
        id: true,
        slug: true,
        name: true,
        coverImageUrl: true,
        publishedAt: true,
        isFeatured: true,
        category: { select: { name: true } },
        _count: {
          select: { invitations: true, uses: true, favorites: true },
        },
      },
      // Unpublished first: they are the ones needing a decision.
      orderBy: [{ publishedAt: "asc" }, { name: "asc" }],
    });

    return templates.map((t) => {
      const usage: TemplateUsage = {
        invitations: t._count.invitations,
        uses: t._count.uses,
        favorites: t._count.favorites,
      };
      return {
        id: t.id,
        slug: t.slug,
        name: t.name,
        categoryName: t.category.name,
        coverImageUrl: t.coverImageUrl,
        publishedAt: t.publishedAt,
        isFeatured: t.isFeatured,
        usage,
        removal: removalPlan(usage),
      };
    });
  } catch (error) {
    logger.report(error, { at: "listCatalogue" });
    return [];
  }
}

export async function listCategories(): Promise<
  { id: string; name: string }[]
> {
  try {
    return await prisma.templateCategory.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  } catch (error) {
    logger.report(error, { at: "listCategories" });
    return [];
  }
}

export type CatalogueResult = { ok: true } | { ok: false; error: string };

/** Leaves the catalogue; keeps every invitation already built on it. */
export async function setPublished(
  templateId: string,
  published: boolean,
): Promise<CatalogueResult> {
  try {
    await prisma.template.update({
      where: { id: templateId },
      data: { publishedAt: published ? new Date() : null },
    });
    return { ok: true };
  } catch (error) {
    logger.report(error, { at: "setPublished", templateId });
    return { ok: false, error: "Could not update that template." };
  }
}

/**
 * Deletes a template, but only if nothing is standing on it.
 *
 * The usage check is re-run here rather than trusted from the page. The page
 * rendered its counts at some point in the past; a customer could have started
 * an invitation since, and a delete authorised by a stale number is exactly the
 * one that strips somebody's design.
 */
export async function deleteTemplate(
  templateId: string,
): Promise<CatalogueResult> {
  try {
    const template = await prisma.template.findUnique({
      where: { id: templateId },
      select: {
        name: true,
        _count: { select: { invitations: true, uses: true, favorites: true } },
      },
    });

    if (!template) return { ok: false, error: "That template no longer exists." };

    const usage: TemplateUsage = {
      invitations: template._count.invitations,
      uses: template._count.uses,
      favorites: template._count.favorites,
    };

    if (!canDelete(usage)) {
      return { ok: false, error: removalPlan(usage).blockedReason };
    }

    await prisma.template.delete({ where: { id: templateId } });
    return { ok: true };
  } catch (error) {
    logger.report(error, { at: "deleteTemplate", templateId });
    return { ok: false, error: "Could not delete that template." };
  }
}

export type CreateResult =
  | { ok: true; slug: string }
  | { ok: false; error: string };

/**
 * Adds a catalogue entry.
 *
 * Created unpublished. A new template arrives with generated cover art and no
 * uploaded design, and pushing that straight into a live catalogue would show
 * customers the very placeholder artwork this admin section exists to replace.
 * Publishing is a second, deliberate click.
 */
export async function createTemplate(
  input: NewTemplateInput,
): Promise<CreateResult> {
  try {
    const category = await prisma.templateCategory.findUnique({
      where: { id: input.categoryId },
      select: { name: true, slug: true },
    });
    if (!category) return { ok: false, error: "That occasion no longer exists." };

    // Uniqueness decided against what is actually taken, not hoped for. The
    // unique constraint is still the backstop, but a friendly suffix beats a
    // Prisma error surfacing as "could not create".
    const taken = await prisma.template.findMany({ select: { slug: true } });
    const slug = uniqueSlug(
      slugifyTemplateName(input.name),
      taken.map((t) => t.slug),
    );

    await prisma.template.create({
      data: {
        slug,
        name: input.name.trim(),
        shortDescription: input.shortDescription.trim(),
        description: input.description.trim(),
        designer: input.designer.trim(),
        categoryId: input.categoryId,
        // Generated art so the row is never coverless. Uploading a real design
        // and applying it is the next step, and it overwrites this.
        coverImageUrl: placeholderUrl(
          "cover",
          slug,
          input.name.trim(),
          category.name,
        ),
        publishedAt: null,
      },
    });

    return { ok: true, slug };
  } catch (error) {
    logger.report(error, { at: "createTemplate" });
    return { ok: false, error: "Could not create that template." };
  }
}
