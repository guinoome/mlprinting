"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { getProfile } from "@/lib/auth/session";
import { logger } from "@/lib/logger";
import { routes } from "@/lib/config";
import { assertOwnership } from "./repository";
import { resolveStep } from "./steps";
import { completionErrors } from "./completeness";
import {
  draftTitleSchema,
  eventStepSchema,
  hostsStepSchema,
  venueStepSchema,
  contentStepSchema,
  personalizeStepSchema,
  mediaStepSchema,
  templateStepSchema,
} from "./schema";

/**
 * Builder actions — Ph3.md §8 (Auto Save), §11 (Draft Management).
 *
 * Every action resolves the caller from the session and scopes its write to
 * their own invitation. No action accepts a profileId, and every one proves
 * ownership before touching a row — an invitation id is a uuid, but a uuid is
 * not an authorisation.
 *
 * Save actions return state rather than redirecting: autosave fires while the
 * customer is typing, and a redirect mid-keystroke would be a bug you could
 * feel.
 */

export interface SaveState {
  /** Set on success — drives the "Saved 14:32" indicator. */
  savedAt?: string;
  error?: string;
  fieldErrors?: Record<string, string>;
}

const NOT_CONFIGURED: SaveState = {
  error: "Saving is not available on this deployment.",
};

const NOT_FOUND: SaveState = {
  error: "That invitation no longer exists.",
};

function fieldErrorsFrom(issues: { path: PropertyKey[]; message: string }[]) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    // Join the path so nested list fields land on the right input:
    // hosts.0.displayName rather than a generic "hosts".
    const key = issue.path.map(String).join(".");
    if (key && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return fieldErrors;
}

/**
 * Resolve the caller and prove they own this invitation.
 *
 * An explicit discriminated union rather than an inferred one: TypeScript
 * normalises the inferred version into members with optional `error?: undefined`
 * properties, and `"error" in auth` then narrows to something whose `error` is
 * still `string | undefined`.
 */
type Authorized = { ok: true; profileId: string };
type Unauthorized = { ok: false; error: string };

async function authorize(
  invitationId: string,
): Promise<Authorized | Unauthorized> {
  const profile = await getProfile();
  if (!profile) return { ok: false, error: "Please sign in again." };

  const owned = await assertOwnership(profile.id, invitationId);
  if (!owned) return { ok: false, error: "That invitation no longer exists." };

  return { ok: true, profileId: profile.id };
}

/** Stamp the save time. Every step's save funnels through this. */
async function touch(invitationId: string, currentStep?: string) {
  const savedAt = new Date();
  await prisma.invitation.update({
    where: { id: invitationId },
    data: {
      lastSavedAt: savedAt,
      ...(currentStep ? { currentStep } : {}),
    },
  });
  return savedAt;
}

// --- Draft lifecycle (Ph3.md §11) ---

/** Rename — Ph3.md §11. */
export async function renameDraft(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  const invitationId = String(formData.get("invitationId") ?? "");
  const auth = await authorize(invitationId);
  if (!auth.ok) return { error: auth.error };

  const parsed = draftTitleSchema.safeParse({ title: formData.get("title") });
  if (!parsed.success)
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  try {
    await prisma.invitation.update({
      where: { id: invitationId },
      data: { title: parsed.data.title },
    });

    revalidatePath(routes.dashboard.events);
    revalidatePath(`${routes.builder}/${invitationId}`, "layout");
    return { savedAt: new Date().toISOString() };
  } catch (error) {
    logger.report(error, { at: "renameDraft", invitationId });
    return { error: "Could not rename that draft." };
  }
}

/** Delete — Ph3.md §11. Cascades hosts, venues, content, and media links (never the assets). */
export async function deleteDraft(
  formData: FormData,
): Promise<never | { error: string }> {
  const invitationId = String(formData.get("invitationId") ?? "");
  const auth = await authorize(invitationId);
  if (!auth.ok) return { error: auth.error };

  try {
    await prisma.invitation.delete({ where: { id: invitationId } });
    revalidatePath(routes.dashboard.events);
  } catch (error) {
    logger.report(error, { at: "deleteDraft", invitationId });
    return { error: "Could not delete that draft." };
  }

  redirect(routes.dashboard.events);
}

// --- Step saves (Ph3.md §8) ---

/** Ph3.md §1 step 1 — Select Template. */
export async function saveTemplateStep(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  if (!isDatabaseConfigured()) return NOT_CONFIGURED;

  const invitationId = String(formData.get("invitationId") ?? "");
  const auth = await authorize(invitationId);
  if (!auth.ok) return { error: auth.error };

  const parsed = templateStepSchema.safeParse({
    templateSlug: formData.get("templateSlug"),
  });
  if (!parsed.success)
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  try {
    const template = await prisma.template.findFirst({
      where: { slug: parsed.data.templateSlug, publishedAt: { not: null } },
      select: { id: true, category: { select: { slug: true } } },
    });
    if (!template) return { error: "That template is no longer available." };

    const current = await prisma.invitation.findUnique({
      where: { id: invitationId },
      select: { eventType: true },
    });

    await prisma.invitation.update({
      where: { id: invitationId },
      data: {
        templateId: template.id,
        // Only seed the event type if the customer has not set one. Changing
        // template should not silently rewrite what their event IS.
        ...(current?.eventType ? {} : { eventType: template.category.slug }),
      },
    });

    const savedAt = await touch(invitationId, "template");
    revalidatePath(`${routes.builder}/${invitationId}`, "layout");
    return { savedAt: savedAt.toISOString() };
  } catch (error) {
    logger.report(error, { at: "saveTemplateStep", invitationId });
    return { error: "Could not save that. Please try again." };
  }
}

/** Ph3.md §2 — Event Information. */
export async function saveEventStep(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  if (!isDatabaseConfigured()) return NOT_CONFIGURED;

  const invitationId = String(formData.get("invitationId") ?? "");
  const auth = await authorize(invitationId);
  if (!auth.ok) return { error: auth.error };

  const parsed = eventStepSchema.safeParse({
    eventType: formData.get("eventType") ?? undefined,
    eventTitle: formData.get("eventTitle") ?? undefined,
    subtitle: formData.get("subtitle") ?? undefined,
    eventDate: formData.get("eventDate") ?? undefined,
    eventTime: formData.get("eventTime") ?? undefined,
    timeZone: formData.get("timeZone") ?? undefined,
    rsvpDeadline: formData.get("rsvpDeadline") ?? undefined,
    dressCode: formData.get("dressCode") ?? undefined,
    eventTheme: formData.get("eventTheme") ?? undefined,
    language: formData.get("language") ?? undefined,
  });

  if (!parsed.success)
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  try {
    await prisma.invitation.update({
      where: { id: invitationId },
      // `?? null` throughout: a cleared field must write null, not be skipped.
      // `undefined` in Prisma means "leave alone", which would make it
      // impossible to delete a subtitle you had second thoughts about.
      data: {
        eventType: parsed.data.eventType ?? null,
        eventTitle: parsed.data.eventTitle ?? null,
        subtitle: parsed.data.subtitle ?? null,
        eventDate: parsed.data.eventDate ?? null,
        eventTime: parsed.data.eventTime ?? null,
        timeZone: parsed.data.timeZone,
        rsvpDeadline: parsed.data.rsvpDeadline ?? null,
        dressCode: parsed.data.dressCode ?? null,
        eventTheme: parsed.data.eventTheme ?? null,
        language: parsed.data.language,
      },
    });

    const savedAt = await touch(invitationId, "event");
    revalidatePath(`${routes.builder}/${invitationId}`, "layout");
    return { savedAt: savedAt.toISOString() };
  } catch (error) {
    logger.report(error, { at: "saveEventStep", invitationId });
    return { error: "Could not save that. Please try again." };
  }
}

/**
 * Ph3.md §3 — Hosts. The whole list arrives as JSON.
 *
 * Replace-in-a-transaction rather than diffing: the client owns the list's
 * order and membership, a diff would need stable client ids for unsaved rows,
 * and the lists are small. The transaction is what stops a failed write leaving
 * a customer with half their hosts.
 */
export async function saveHostsStep(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  if (!isDatabaseConfigured()) return NOT_CONFIGURED;

  const invitationId = String(formData.get("invitationId") ?? "");
  const auth = await authorize(invitationId);
  if (!auth.ok) return { error: auth.error };

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("hosts") ?? "[]"));
  } catch {
    return { error: "Could not read that. Please try again." };
  }

  const parsed = hostsStepSchema.safeParse({ hosts: payload });
  if (!parsed.success)
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  try {
    await prisma.$transaction([
      prisma.invitationHost.deleteMany({ where: { invitationId } }),
      prisma.invitationHost.createMany({
        data: parsed.data.hosts.map((host, index) => ({
          invitationId,
          role: host.role,
          displayName: host.displayName,
          biography: host.biography ?? null,
          photoAssetId: host.photoAssetId ?? null,
          sortOrder: index,
        })),
      }),
    ]);

    const savedAt = await touch(invitationId, "hosts");
    revalidatePath(`${routes.builder}/${invitationId}`, "layout");
    return { savedAt: savedAt.toISOString() };
  } catch (error) {
    logger.report(error, { at: "saveHostsStep", invitationId });
    return { error: "Could not save that. Please try again." };
  }
}

/** Ph3.md §4 — Schedule & Venue. */
export async function saveVenueStep(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  if (!isDatabaseConfigured()) return NOT_CONFIGURED;

  const invitationId = String(formData.get("invitationId") ?? "");
  const auth = await authorize(invitationId);
  if (!auth.ok) return { error: auth.error };

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("venues") ?? "[]"));
  } catch {
    return { error: "Could not read that. Please try again." };
  }

  const parsed = venueStepSchema.safeParse({ venues: payload });
  if (!parsed.success)
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  try {
    await prisma.$transaction([
      prisma.invitationVenue.deleteMany({ where: { invitationId } }),
      prisma.invitationVenue.createMany({
        data: parsed.data.venues.map((venue, index) => ({
          invitationId,
          kind: venue.kind,
          name: venue.name,
          address: venue.address ?? null,
          mapsUrl: venue.mapsUrl ?? null,
          parkingNotes: venue.parkingNotes ?? null,
          contactName: venue.contactName ?? null,
          contactPhone: venue.contactPhone ?? null,
          startTime: venue.startTime ?? null,
          sortOrder: index,
        })),
      }),
    ]);

    const savedAt = await touch(invitationId, "venue");
    revalidatePath(`${routes.builder}/${invitationId}`, "layout");
    return { savedAt: savedAt.toISOString() };
  } catch (error) {
    logger.report(error, { at: "saveVenueStep", invitationId });
    return { error: "Could not save that. Please try again." };
  }
}

/** Ph3.md §5 — Invitation Content. */
export async function saveContentStep(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  if (!isDatabaseConfigured()) return NOT_CONFIGURED;

  const invitationId = String(formData.get("invitationId") ?? "");
  const auth = await authorize(invitationId);
  if (!auth.ok) return { error: auth.error };

  let people: unknown;
  let program: unknown;
  try {
    people = JSON.parse(String(formData.get("people") ?? "[]"));
    program = JSON.parse(String(formData.get("program") ?? "[]"));
  } catch {
    return { error: "Could not read that. Please try again." };
  }

  const parsed = contentStepSchema.safeParse({
    welcomeMessage: formData.get("welcomeMessage") ?? undefined,
    invitationMessage: formData.get("invitationMessage") ?? undefined,
    giftsPreference: formData.get("giftsPreference") ?? undefined,
    specialNotes: formData.get("specialNotes") ?? undefined,
    closingMessage: formData.get("closingMessage") ?? undefined,
    people,
    program,
  });

  if (!parsed.success)
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  try {
    await prisma.$transaction([
      prisma.invitationContent.upsert({
        where: { invitationId },
        update: {
          welcomeMessage: parsed.data.welcomeMessage ?? null,
          invitationMessage: parsed.data.invitationMessage ?? null,
          giftsPreference: parsed.data.giftsPreference ?? null,
          specialNotes: parsed.data.specialNotes ?? null,
          closingMessage: parsed.data.closingMessage ?? null,
        },
        create: {
          invitationId,
          welcomeMessage: parsed.data.welcomeMessage ?? null,
          invitationMessage: parsed.data.invitationMessage ?? null,
          giftsPreference: parsed.data.giftsPreference ?? null,
          specialNotes: parsed.data.specialNotes ?? null,
          closingMessage: parsed.data.closingMessage ?? null,
        },
      }),
      prisma.invitationPerson.deleteMany({ where: { invitationId } }),
      prisma.invitationPerson.createMany({
        data: parsed.data.people.map((person, index) => ({
          invitationId,
          group: person.group,
          name: person.name,
          role: person.role ?? null,
          sortOrder: index,
        })),
      }),
      prisma.programItem.deleteMany({ where: { invitationId } }),
      prisma.programItem.createMany({
        data: parsed.data.program.map((item, index) => ({
          invitationId,
          time: item.time ?? null,
          title: item.title,
          description: item.description ?? null,
          sortOrder: index,
        })),
      }),
    ]);

    const savedAt = await touch(invitationId, "content");
    revalidatePath(`${routes.builder}/${invitationId}`, "layout");
    return { savedAt: savedAt.toISOString() };
  } catch (error) {
    logger.report(error, { at: "saveContentStep", invitationId });
    return { error: "Could not save that. Please try again." };
  }
}

/** Ph3.md §6 — Personalization. Slugs are validated against the approved system. */
export async function savePersonalizeStep(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  if (!isDatabaseConfigured()) return NOT_CONFIGURED;

  const invitationId = String(formData.get("invitationId") ?? "");
  const auth = await authorize(invitationId);
  if (!auth.ok) return { error: auth.error };

  const parsed = personalizeStepSchema.safeParse({
    colorTheme: formData.get("colorTheme"),
    typography: formData.get("typography"),
    backgroundStyle: formData.get("backgroundStyle"),
    decorativeStyle: formData.get("decorativeStyle"),
    hiddenSections: formData.getAll("hiddenSections").map(String),
  });

  if (!parsed.success)
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  try {
    await prisma.invitationPersonalization.upsert({
      where: { invitationId },
      update: parsed.data,
      create: { invitationId, ...parsed.data },
    });

    const savedAt = await touch(invitationId, "personalize");
    revalidatePath(`${routes.builder}/${invitationId}`, "layout");
    return { savedAt: savedAt.toISOString() };
  } catch (error) {
    logger.report(error, { at: "savePersonalizeStep", invitationId });
    return { error: "Could not save that. Please try again." };
  }
}

/** Ph3.md §7 — Media. Stores references, never bytes. */
export async function saveMediaStep(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  if (!isDatabaseConfigured()) return NOT_CONFIGURED;

  const invitationId = String(formData.get("invitationId") ?? "");
  const auth = await authorize(invitationId);
  if (!auth.ok) return { error: auth.error };

  let payload: unknown;
  try {
    payload = JSON.parse(String(formData.get("assignments") ?? "[]"));
  } catch {
    return { error: "Could not read that. Please try again." };
  }

  const parsed = mediaStepSchema.safeParse({ assignments: payload });
  if (!parsed.success)
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };

  try {
    // Every referenced asset must belong to the caller. Without this, a crafted
    // request could attach someone else's photo to an invitation by id — and
    // the preview would then happily render it.
    const assetIds = [
      ...new Set(parsed.data.assignments.map((a) => a.assetId)),
    ];
    if (assetIds.length > 0) {
      const owned = await prisma.mediaAsset.count({
        where: { id: { in: assetIds }, profileId: auth.profileId },
      });
      if (owned !== assetIds.length)
        return { error: "One of those images is not available." };
    }

    await prisma.$transaction([
      prisma.invitationMedia.deleteMany({ where: { invitationId } }),
      prisma.invitationMedia.createMany({
        data: parsed.data.assignments.map((assignment, index) => ({
          invitationId,
          assetId: assignment.assetId,
          slot: assignment.slot,
          sortOrder: index,
        })),
        skipDuplicates: true,
      }),
    ]);

    const savedAt = await touch(invitationId, "media");
    revalidatePath(`${routes.builder}/${invitationId}`, "layout");
    return { savedAt: savedAt.toISOString() };
  } catch (error) {
    logger.report(error, { at: "saveMediaStep", invitationId });
    return { error: "Could not save that. Please try again." };
  }
}

/**
 * Finish — Ph3.md §1 step 10, and the §Success Criteria's last line.
 *
 * Marks the dataset complete. It does NOT create an order: that is Ph7, and
 * Ph3.md's Out of Scope is explicit. This is the door, not the next room.
 */
export async function completeDraft(
  _prev: SaveState,
  formData: FormData,
): Promise<SaveState> {
  if (!isDatabaseConfigured()) return NOT_CONFIGURED;

  const invitationId = String(formData.get("invitationId") ?? "");
  const auth = await authorize(invitationId);
  if (!auth.ok) return { error: auth.error };

  try {
    const draft = await prisma.invitation.findUnique({
      where: { id: invitationId },
      select: {
        templateId: true,
        eventTitle: true,
        eventDate: true,
        _count: { select: { hosts: true, venues: true } },
      },
    });
    if (!draft) return NOT_FOUND;

    // Re-checked on the server. The client hides the button when incomplete;
    // that is a courtesy, and this is the rule.
    const issues = completionErrors({
      templateId: draft.templateId,
      eventTitle: draft.eventTitle,
      eventDate: draft.eventDate,
      hostCount: draft._count.hosts,
      venueCount: draft._count.venues,
    });

    if (issues.length > 0) {
      return {
        error: `Still needed: ${issues.map((i) => i.message).join(" ")}`,
      };
    }

    await prisma.invitation.update({
      where: { id: invitationId },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        lastSavedAt: new Date(),
      },
    });

    revalidatePath(routes.dashboard.events);
    revalidatePath(`${routes.builder}/${invitationId}`, "layout");
    return { savedAt: new Date().toISOString() };
  } catch (error) {
    logger.report(error, { at: "completeDraft", invitationId });
    return { error: "Could not finish that invitation. Please try again." };
  }
}

/** Reopen a completed invitation for editing. */
export async function reopenDraft(
  formData: FormData,
): Promise<{ error?: string }> {
  const invitationId = String(formData.get("invitationId") ?? "");
  const auth = await authorize(invitationId);
  if (!auth.ok) return { error: auth.error };

  try {
    await prisma.invitation.update({
      where: { id: invitationId },
      data: { status: "DRAFT", completedAt: null },
    });

    revalidatePath(routes.dashboard.events);
    revalidatePath(`${routes.builder}/${invitationId}`, "layout");
    return {};
  } catch (error) {
    logger.report(error, { at: "reopenDraft", invitationId });
    return { error: "Could not reopen that invitation." };
  }
}

/** Record which step the customer is on — Ph3.md §11 (Resume Draft). */
export async function setCurrentStep(
  invitationId: string,
  step: string,
): Promise<void> {
  const auth = await authorize(invitationId);
  if (!auth.ok) return;

  try {
    await prisma.invitation.update({
      where: { id: invitationId },
      data: { currentStep: resolveStep(step) },
    });
  } catch (error) {
    // Losing your place is a papercut, not a failure worth surfacing.
    logger.report(error, { at: "setCurrentStep", invitationId });
  }
}
