import "server-only";

import { logger } from "@/lib/logger";
import { toPreviewModel, type PreviewInput } from "@/lib/invitation/preview-model";
import { completionErrors } from "@/lib/invitation/completeness";
import { getAsset, type AssetRow } from "@/services/media";
import {
  GENERATOR_VERSION,
  buildReport,
  createGeneration,
  createPrintDocument,
  findInvitationForPrint,
  layoutBack,
  layoutFront,
  markGenerationFailed,
  markGenerationReady,
  nextVersionFor,
  pageSpecFor,
  printColours,
  renderPdf,
  storePdf,
  type PdfSizeSlug,
  type PrintDocument,
  type ValidationReport,
} from "@/services/pdf";

/**
 * Generation orchestration — Ph6.md §1, §9, §11.
 *
 * Order matters and is the whole point of this file: embed fonts, measure with
 * their real metrics, lay out, validate what layout reported, and only then
 * render. Measuring against guessed widths and rendering against real ones is
 * how text that passed validation ends up clipped on the press.
 *
 * Lives in the feature layer, not services/pdf, because it is the only step
 * that needs both the engine and builder-level knowledge of what "complete"
 * means. services/pdf stays a pure engine plus its own persistence.
 */

export interface GenerateInput {
  profileId: string;
  invitationId: string;
  pageSize: PdfSizeSlug;
  cropMarks: boolean;
}

export type GenerateOutcome =
  | {
      ok: true;
      generationId: string;
      version: number;
      report: ValidationReport;
    }
  | { ok: false; report: ValidationReport | null; message: string };

export async function generatePrintFile(
  input: GenerateInput,
): Promise<GenerateOutcome> {
  const invitation = await findInvitationForPrint(
    input.profileId,
    input.invitationId,
  );
  if (!invitation) {
    return {
      ok: false,
      report: null,
      message: "That invitation could not be found.",
    };
  }

  const spec = pageSpecFor(input.pageSize);
  const themeSlug = invitation.personalization?.colorTheme ?? "classic-ivory";
  const typographySlug =
    invitation.personalization?.typography ?? "classic-serif";
  const colours = printColours(themeSlug);
  const hidden = new Set(invitation.personalization?.hiddenSections ?? []);

  // mediaUrls is deliberately empty: print addresses assets by id and fetches
  // their bytes from storage itself. The preview model's URLs exist for the
  // browser, and a print renderer has no use for one.
  const model = toPreviewModel({
    eventTitle: invitation.eventTitle,
    subtitle: invitation.subtitle,
    eventDate: invitation.eventDate,
    eventTime: invitation.eventTime,
    timeZone: invitation.timeZone,
    rsvpDeadline: invitation.rsvpDeadline,
    dressCode: invitation.dressCode,
    eventTheme: invitation.eventTheme,
    language: invitation.language,
    hosts: invitation.hosts,
    venues: invitation.venues,
    content: invitation.content,
    people: invitation.people,
    program: invitation.program,
    personalization: invitation.personalization,
    mediaUrls: {},
  } satisfies PreviewInput);

  const coverAssetId =
    invitation.media.find((link) => link.slot === "COVER")?.asset.id ?? null;

  const completion = completionErrors({
    templateId: invitation.templateId,
    eventTitle: invitation.eventTitle,
    eventDate: invitation.eventDate,
    hostCount: invitation.hosts.length,
    venueCount: invitation.venues.length,
  });

  // Fonts first — layout measures against these exact metrics.
  let printDoc: PrintDocument;
  try {
    printDoc = await createPrintDocument(typographySlug);
  } catch (error) {
    logger.report(error, { at: "generatePrintFile.fonts", typographySlug });
    return {
      ok: false,
      report: buildReport({
        spec,
        typographySlug,
        completionIssues: completion,
        overflows: [],
        images: [],
        hasCover: coverAssetId !== null,
        backIsEmpty: true,
      }),
      message: "This invitation's typography has no print font.",
    };
  }

  const front = layoutFront({
    spec,
    colours,
    measure: printDoc.measure,
    title: model.title,
    subtitle: model.subtitle,
    dateLine: model.dateLine,
    timeLine: model.timeLine,
    hostNames: model.hosts.map((host) => host.name),
    invitationMessage: model.invitationMessage,
    venueLines: model.venues.map((venue) =>
      [venue.label, venue.name, venue.address].filter(Boolean).join(" — "),
    ),
    coverAssetId,
    hidden,
  });

  const back = layoutBack({
    spec,
    colours,
    measure: printDoc.measure,
    parents: model.parents.map((person) => person.name),
    sponsors: model.sponsors.map((person) => person.name),
    programme: model.program.map((item) => ({
      time: item.time,
      title: item.title,
    })),
    dressCode: model.dressCode,
    giftsPreference: model.giftsPreference,
    specialNotes: model.specialNotes,
    rsvpLine: model.rsvpLine,
    hidden,
  });

  // Only assets layout actually placed are fetched and DPI-checked. Checking
  // every asset on the invitation would block generation over a photo that
  // never reaches the card.
  const placed = [...front.instructions, ...back.instructions].filter(
    (item): item is Extract<typeof item, { kind: "image" }> =>
      item.kind === "image",
  );

  const assetsById = new Map<string, AssetRow>();
  const images: {
    assetId: string;
    width: number | null;
    height: number | null;
    boxWidthPt: number;
    boxHeightPt: number;
  }[] = [];

  for (const item of placed) {
    const asset = await getAsset(input.profileId, item.assetId);
    if (!asset) continue;
    assetsById.set(asset.id, asset);
    images.push({
      assetId: asset.id,
      width: asset.width,
      height: asset.height,
      boxWidthPt: item.box.width,
      boxHeightPt: item.box.height,
    });
  }

  const report = buildReport({
    spec,
    typographySlug,
    completionIssues: completion,
    overflows: [...front.overflows, ...back.overflows],
    images,
    hasCover: coverAssetId !== null,
    backIsEmpty: back.isEmpty,
  });

  if (!report.canGenerate) {
    // No row is written for a run that never started. A PdfGeneration row means
    // "we tried to build a file"; refusing on pre-flight is the system working,
    // not a failed generation, and recording it as one would make the version
    // history unreadable.
    return {
      ok: false,
      report,
      message: "This invitation is not ready to print yet.",
    };
  }

  const version = await nextVersionFor(input.invitationId);
  const row = await createGeneration({
    invitationId: input.invitationId,
    version,
    pageSize: input.pageSize,
    generatorVersion: GENERATOR_VERSION,
    templateVersion: invitation.template?.version ?? null,
  });
  if (!row) {
    return {
      ok: false,
      report,
      message: "Could not start the print file. Try again.",
    };
  }

  try {
    // A back with nothing on it is not printed: a blank second side costs money
    // at the press and reads as a mistake (design doc Decision 3).
    const pages = back.isEmpty
      ? [front.instructions]
      : [front.instructions, back.instructions];

    const bytes = await renderPdf(printDoc, {
      spec,
      pages,
      cropMarks: input.cropMarks,
      assetsById,
      metadata: {
        invitationId: invitation.id,
        profileId: input.profileId,
        templateVersion: invitation.template?.version ?? null,
      },
    });

    const path = await storePdf(input.profileId, invitation.id, row.id, bytes);
    if (!path) {
      await markGenerationFailed(row.id, "Storage write failed.", report);
      return {
        ok: false,
        report,
        message: "Could not save the print file. Try again.",
      };
    }

    await markGenerationReady(row.id, path, bytes.byteLength, report);
    return { ok: true, generationId: row.id, version, report };
  } catch (error) {
    logger.report(error, {
      at: "generatePrintFile.render",
      invitationId: invitation.id,
    });
    await markGenerationFailed(row.id, "Rendering failed.", report);
    return {
      ok: false,
      report,
      message: "Something went wrong building the file.",
    };
  }
}
