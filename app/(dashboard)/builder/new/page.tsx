import { redirect, notFound } from "next/navigation";
import { getProfile, isAuthConfigured } from "@/lib/auth/session";
import { ConfigurationRequired } from "@/components/configuration-required";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { routes, features } from "@/lib/config";
import { DESIGN_DEFAULTS } from "@/lib/config/design-vocabulary";
import { FIRST_STEP } from "@/features/invitation-builder/steps";

/**
 * Start a draft from a template — the landing point for Ph2's "Use this
 * template".
 *
 * WHY THIS ROUTE EXISTS: the marketplace has to hand off to the builder, but a
 * feature may not import another feature (see docs/architecture.md). So Ph2
 * redirects to a *route* it knows from lib/config, and the builder owns what
 * happens here. The boundary holds and neither feature knows the other's code.
 *
 * WHY A GET CREATES DATA: it is a navigation target, so it has to. The usual
 * objection — refresh makes a duplicate — is handled by reusing an untouched
 * draft for the same template rather than minting a second one. That also makes
 * the back button do the obvious thing: return to the draft you just started.
 */
export const dynamic = "force-dynamic";

export default async function NewDraftPage({
  searchParams,
}: {
  searchParams: { template?: string };
}) {
  if (!isAuthConfigured()) return <ConfigurationRequired />;
  if (!features.invitationBuilder) notFound();

  const profile = await getProfile();
  if (!profile) {
    const back = `${routes.builder}/new${searchParams.template ? `?template=${encodeURIComponent(searchParams.template)}` : ""}`;
    redirect(`${routes.login}?redirectTo=${encodeURIComponent(back)}`);
  }

  let destination: string;

  try {
    const template = searchParams.template
      ? await prisma.template.findFirst({
          where: { slug: searchParams.template, publishedAt: { not: null } },
          select: {
            id: true,
            name: true,
            category: { select: { slug: true } },
          },
        })
      : null;

    // Reuse an untouched draft rather than pile up duplicates. "Untouched"
    // means the same template and nothing typed yet — a draft with a title is
    // work, and starting fresh alongside it is the right call.
    const existing = await prisma.invitation.findFirst({
      where: {
        profileId: profile.id,
        status: "DRAFT",
        templateId: template?.id ?? null,
        eventTitle: null,
        hosts: { none: {} },
        venues: { none: {} },
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, currentStep: true },
    });

    if (existing) {
      destination = `${routes.builder}/${existing.id}/${existing.currentStep}`;
    } else {
      const invitation = await prisma.invitation.create({
        data: {
          profileId: profile.id,
          templateId: template?.id ?? null,
          title: template
            ? `${template.name} invitation`
            : "Untitled invitation",
          eventType: template?.category.slug ?? null,
          // A template chosen in the marketplace means step 1 is already done.
          currentStep: template ? "event" : FIRST_STEP,
          content: { create: {} },
          personalization: {
            create: { ...DESIGN_DEFAULTS, hiddenSections: [] },
          },
        },
        select: { id: true, currentStep: true },
      });

      destination = `${routes.builder}/${invitation.id}/${invitation.currentStep}`;
    }
  } catch (error) {
    logger.report(error, { at: "NewDraftPage", profileId: profile.id });
    // Their events list is a better landing place than an error page — the
    // "New invitation" button there is the same action, one click away.
    redirect(routes.dashboard.events);
  }

  // Outside the try: redirect() signals by throwing, and catching it here would
  // swallow the navigation and log it as a failure.
  redirect(destination);
}
