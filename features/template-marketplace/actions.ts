"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { getProfile } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { routes, features } from "@/lib/config";

/**
 * Marketplace actions — Ph2.md §9.
 *
 * Every action derives the caller from the session. Nothing here accepts a
 * profile id from the form, so no amount of editing the request lets one person
 * favourite a template on another's behalf.
 */

const slugSchema = z.string().trim().min(1).max(120);

export interface ToggleFavoriteResult {
  favorited?: boolean;
  error?: string;
}

/**
 * useTemplate's result. Only ever an error: every success path redirects, so
 * there is no state left to render on this page.
 */
export interface UseTemplateState {
  error?: string;
}

/**
 * Toggle a favourite — Ph2.md §9.
 *
 * Resolves the template by slug rather than trusting an id from the form: the
 * slug is what the URL already exposes, and looking it up proves the row exists
 * and is published before writing a foreign key to it.
 */
export async function toggleFavorite(
  formData: FormData,
): Promise<ToggleFavoriteResult> {
  if (!isDatabaseConfigured()) {
    return { error: "Favourites are not available on this deployment." };
  }

  const parsed = slugSchema.safeParse(formData.get("slug"));
  if (!parsed.success) return { error: "Unknown template." };

  const profile = await getProfile();
  if (!profile) {
    // Not an error the UI should shout about — the button is only shown to
    // signed-in visitors, so reaching here means a stale page or a direct post.
    return { error: "Sign in to save favourites." };
  }

  try {
    const template = await prisma.template.findFirst({
      where: { slug: parsed.data, publishedAt: { not: null } },
      select: { id: true },
    });
    if (!template) return { error: "Unknown template." };

    const existing = await prisma.templateFavorite.findUnique({
      where: {
        profileId_templateId: {
          profileId: profile.id,
          templateId: template.id,
        },
      },
    });

    if (existing) {
      await prisma.templateFavorite.delete({
        where: {
          profileId_templateId: {
            profileId: profile.id,
            templateId: template.id,
          },
        },
      });
    } else {
      await prisma.templateFavorite.create({
        data: { profileId: profile.id, templateId: template.id },
      });
    }

    revalidatePath(routes.templates);
    revalidatePath(`${routes.templates}/${parsed.data}`);

    return { favorited: !existing };
  } catch (error) {
    logger.report(error, { at: "toggleFavorite", profileId: profile.id });
    return { error: "Could not save that. Please try again." };
  }
}

/**
 * Record that someone looked at a template — Ph2.md §9 (Recently Viewed).
 *
 * Fire-and-forget from the preview page. Silently does nothing when anonymous:
 * "recently viewed" is a convenience, and there is nowhere to hang it without
 * an account. It deliberately never throws — a failed analytics-shaped write
 * must not take down the page it was recording.
 */
export async function recordView(slug: string): Promise<void> {
  if (!isDatabaseConfigured()) return;

  const profile = await getProfile();
  if (!profile) return;

  try {
    const template = await prisma.template.findFirst({
      where: { slug, publishedAt: { not: null } },
      select: { id: true },
    });
    if (!template) return;

    // Upsert, not create: one row per profile+template with viewedAt moved
    // forward. See the TemplateView model for why this is not an event log.
    await prisma.templateView.upsert({
      where: {
        profileId_templateId: {
          profileId: profile.id,
          templateId: template.id,
        },
      },
      update: { viewedAt: new Date() },
      create: { profileId: profile.id, templateId: template.id },
    });
  } catch (error) {
    logger.report(error, { at: "recordView", slug });
  }
}

/**
 * Select a template to build with — Ph2.md §9 (Recently Used), and the
 * Success Criteria's "Proceed to the Guided Invitation Builder".
 *
 * Phase 2 ends here. The builder is Ph3, and Ph2.md's Out of Scope forbids
 * editing — so this records the choice and hands off. Until the builder exists,
 * the flag routes the customer somewhere honest rather than to a 404.
 */
export async function useTemplate(
  _prevState: UseTemplateState,
  formData: FormData,
): Promise<UseTemplateState> {
  const parsed = slugSchema.safeParse(formData.get("slug"));
  if (!parsed.success) return { error: "Unknown template." };

  const slug = parsed.data;
  const profile = await getProfile();

  if (!profile) {
    // Send them to sign in, and back here afterwards. safeRedirect on the login
    // side sanitises this before it is honoured.
    redirect(
      `${routes.login}?redirectTo=${encodeURIComponent(`${routes.templates}/${slug}`)}`,
    );
  }

  if (isDatabaseConfigured()) {
    try {
      const template = await prisma.template.findFirst({
        where: { slug, publishedAt: { not: null } },
        select: { id: true },
      });
      if (!template) return { error: "Unknown template." };

      const existing = await prisma.templateUse.findUnique({
        where: {
          profileId_templateId: {
            profileId: profile.id,
            templateId: template.id,
          },
        },
      });

      await prisma.$transaction([
        prisma.templateUse.upsert({
          where: {
            profileId_templateId: {
              profileId: profile.id,
              templateId: template.id,
            },
          },
          update: { usedAt: new Date() },
          create: { profileId: profile.id, templateId: template.id },
        }),
        // Only count a *new* user of this template. Incrementing on every
        // re-selection would let one indecisive customer manufacture a
        // bestseller, and useCount feeds both the Most Popular sort and the
        // recommender.
        ...(existing
          ? []
          : [
              prisma.template.update({
                where: { id: template.id },
                data: { useCount: { increment: 1 } },
              }),
            ]),
      ]);

      revalidatePath(routes.templates);
    } catch (error) {
      logger.report(error, { at: "useTemplate", slug, profileId: profile.id });
      return { error: "Could not select that template. Please try again." };
    }
  }

  if (features.invitationBuilder) {
    // A route, not an import: the builder owns draft creation, and a feature
    // may not import another feature (docs/architecture.md). lib/config is the
    // shared knowledge between them.
    redirect(`${routes.builderNew}?template=${encodeURIComponent(slug)}`);
  }

  // The builder is switched off. The selection is recorded and will be waiting.
  redirect(`${routes.templates}/${slug}?selected=1`);
}
