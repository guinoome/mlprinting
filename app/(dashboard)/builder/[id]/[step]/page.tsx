import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getProfile } from "@/lib/auth/session";
import { prisma } from "@/lib/db";
import { routes } from "@/lib/config";
import { getDraft, snapshotOf } from "@/features/invitation-builder/repository";
import { isBuilderStep, getStep } from "@/features/invitation-builder/steps";
import { completionErrors } from "@/lib/invitation/completeness";
import { setCurrentStep } from "@/features/invitation-builder/actions";
import { StepFrame } from "@/features/invitation-builder/components/step-frame";
import { TemplateStep } from "@/features/invitation-builder/components/steps/template-step";
import { EventStep } from "@/features/invitation-builder/components/steps/event-step";
import { HostsStep } from "@/features/invitation-builder/components/steps/hosts-step";
import { VenueStep } from "@/features/invitation-builder/components/steps/venue-step";
import { ContentStep } from "@/features/invitation-builder/components/steps/content-step";
import { MediaStep } from "@/features/invitation-builder/components/steps/media-step";
import { PersonalizeStep } from "@/features/invitation-builder/components/steps/personalize-step";
import { PreviewStep } from "@/features/invitation-builder/components/steps/preview-step";
import { toPreviewModel } from "@/lib/invitation/preview-model";
import { listAssets, thumbnailUrl, previewUrl } from "@/services/media";
import { DESIGN_DEFAULTS } from "@/lib/config/design-vocabulary";

/**
 * One step of the builder — Ph3.md §1.
 *
 * A single route rather than eight, because the steps share a shell, a draft
 * load, and a frame. The switch below is the only place that knows which
 * component belongs to which slug.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: { step: string };
}): Promise<Metadata> {
  const step = getStep(params.step);
  return { title: step ? step.label : "Builder" };
}

/** A Date → the "YYYY-MM-DD" a date input wants. */
function toDateInput(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export default async function BuilderStepPage({
  params,
}: {
  params: { id: string; step: string };
}) {
  if (!isBuilderStep(params.step)) notFound();

  const profile = await getProfile();
  if (!profile) redirect(routes.login);

  const draft = await getDraft(profile.id, params.id);
  if (!draft) notFound();

  // Remember where they are — Ph3.md §11 (Resume Draft). Fire-and-forget in
  // spirit, but awaited: a Server Component's floating promise can be dropped
  // when the response ends.
  if (draft.currentStep !== params.step) {
    await setCurrentStep(draft.id, params.step);
  }

  const snapshot = snapshotOf(draft);

  return (
    <StepFrame invitationId={draft.id} step={params.step}>
      {await renderStep()}
    </StepFrame>
  );

  async function renderStep() {
    switch (params.step) {
      case "template": {
        // A short list — browsing properly is what Ph2's marketplace is for.
        const templates = await prisma.template.findMany({
          where: { publishedAt: { not: null } },
          orderBy: [
            { isFeatured: "desc" },
            { useCount: "desc" },
            { slug: "asc" },
          ],
          take: 12,
          select: {
            slug: true,
            name: true,
            coverImageUrl: true,
            orientation: true,
            category: { select: { name: true } },
          },
        });

        return (
          <TemplateStep
            invitationId={draft!.id}
            selectedSlug={draft!.template?.slug ?? null}
            templates={templates.map((template) => ({
              slug: template.slug,
              name: template.name,
              categoryName: template.category.name,
              coverImageUrl: template.coverImageUrl,
              orientation: template.orientation,
            }))}
          />
        );
      }

      case "event": {
        const categories = await prisma.templateCategory.findMany({
          where: { isActive: true },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
          select: { slug: true, name: true },
        });

        return (
          <EventStep
            invitationId={draft!.id}
            eventTypes={categories}
            initial={{
              eventType: draft!.eventType ?? "",
              eventTitle: draft!.eventTitle ?? "",
              subtitle: draft!.subtitle ?? "",
              eventDate: toDateInput(draft!.eventDate),
              eventTime: draft!.eventTime ?? "",
              timeZone: draft!.timeZone,
              rsvpDeadline: toDateInput(draft!.rsvpDeadline),
              dressCode: draft!.dressCode ?? "",
              eventTheme: draft!.eventTheme ?? "",
              language: draft!.language,
            }}
          />
        );
      }

      case "hosts":
        return (
          <HostsStep
            invitationId={draft!.id}
            eventType={draft!.eventType}
            initial={draft!.hosts.map((host) => ({
              key: host.id,
              role: host.role,
              displayName: host.displayName,
              biography: host.biography ?? "",
            }))}
          />
        );

      case "venue":
        return (
          <VenueStep
            invitationId={draft!.id}
            initial={draft!.venues.map((venue) => ({
              key: venue.id,
              kind: venue.kind,
              name: venue.name,
              address: venue.address ?? "",
              mapsUrl: venue.mapsUrl ?? "",
              parkingNotes: venue.parkingNotes ?? "",
              contactName: venue.contactName ?? "",
              contactPhone: venue.contactPhone ?? "",
              startTime: venue.startTime ?? "",
            }))}
          />
        );

      case "content":
        return (
          <ContentStep
            invitationId={draft!.id}
            initialContent={{
              welcomeMessage: draft!.content?.welcomeMessage ?? "",
              invitationMessage: draft!.content?.invitationMessage ?? "",
              giftsPreference: draft!.content?.giftsPreference ?? "",
              specialNotes: draft!.content?.specialNotes ?? "",
              closingMessage: draft!.content?.closingMessage ?? "",
            }}
            initialPeople={draft!.people
              .filter((person) => person.group !== "ENTOURAGE")
              .map((person) => ({
                key: person.id,
                group: person.group as "PARENT" | "SPONSOR",
                name: person.name,
                role: person.role ?? "",
              }))}
            initialProgram={draft!.program.map((item) => ({
              key: item.id,
              time: item.time ?? "",
              title: item.title,
              description: item.description ?? "",
            }))}
          />
        );

      case "media": {
        const assets = await listAssets(profile!.id);
        // Proxy URLs, built from id+version — no signed URL ever reaches the
        // client (design doc Decision 4).

        return (
          <MediaStep
            invitationId={draft!.id}
            assets={assets.map((asset) => ({
              id: asset.id,
              thumbnailUrl: thumbnailUrl(asset),
              altText: asset.altText,
              originalFilename: asset.originalFilename,
              tags: asset.tags,
            }))}
            initialAssignments={draft!.media
              .filter((link) => link.slot !== "MUSIC")
              .map((link) => ({
                assetId: link.assetId,
                slot: link.slot as "COVER" | "COUPLE" | "FAMILY" | "LOGO",
              }))}
          />
        );
      }

      case "personalize":
        return (
          <PersonalizeStep
            invitationId={draft!.id}
            initial={{
              colorTheme:
                draft!.personalization?.colorTheme ??
                DESIGN_DEFAULTS.colorTheme,
              typography:
                draft!.personalization?.typography ??
                DESIGN_DEFAULTS.typography,
              backgroundStyle:
                draft!.personalization?.backgroundStyle ??
                DESIGN_DEFAULTS.backgroundStyle,
              decorativeStyle:
                draft!.personalization?.decorativeStyle ??
                DESIGN_DEFAULTS.decorativeStyle,
              hiddenSections: draft!.personalization?.hiddenSections ?? [],
            }}
          />
        );

      case "preview": {
        // Group resolved URLs by slot for the view model.
        const mediaUrls: Partial<
          Record<"COVER" | "COUPLE" | "FAMILY" | "LOGO", string[]>
        > = {};
        for (const link of draft!.media) {
          if (link.slot === "MUSIC") continue;

          const slot = link.slot as "COVER" | "COUPLE" | "FAMILY" | "LOGO";
          (mediaUrls[slot] ??= []).push(previewUrl(link.asset));
        }

        const model = toPreviewModel({
          eventTitle: draft!.eventTitle,
          subtitle: draft!.subtitle,
          eventDate: draft!.eventDate,
          eventTime: draft!.eventTime,
          timeZone: draft!.timeZone,
          rsvpDeadline: draft!.rsvpDeadline,
          dressCode: draft!.dressCode,
          eventTheme: draft!.eventTheme,
          language: draft!.language,
          hosts: draft!.hosts,
          venues: draft!.venues,
          content: draft!.content,
          people: draft!.people,
          program: draft!.program,
          personalization: draft!.personalization,
          mediaUrls,
        });

        return (
          <PreviewStep
            invitationId={draft!.id}
            model={model}
            issues={completionErrors(snapshot)}
            isCompleted={draft!.status === "COMPLETED"}
          />
        );
      }

      default:
        notFound();
    }
  }
}
