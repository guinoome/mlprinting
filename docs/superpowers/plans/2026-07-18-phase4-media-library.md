# Phase 4 — Invitation Media Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn Phase 3's minimal `MediaAsset`/`InvitationMedia` seam into the real
Invitation Media Library — computed folders, search, storage quota, `sharp`-based
image processing with thumbnail/preview variants, an authenticated serving proxy, a
real multi-file Upload Manager with progress/retry/cancel, and a full Asset Browser —
per the approved design at
`docs/superpowers/specs/2026-07-18-phase4-media-library-design.md`.

**Architecture:** `services/media/` is split into focused modules (paths, processing,
storage, repository, folders, criteria, query) behind one barrel (`index.ts`), the only
module any feature ever imports. Two new route handlers carry the two things Server
Actions can't do: `app/api/media/upload/route.ts` (byte-level progress via XHR) and
`app/api/media/[assetId]/[version]/[variant]/route.ts` (authenticated image serving
with safe immutable caching). A new `features/media-library/` feature composes shared
`components/media/*` UI and a shared `lib/hooks/use-upload-queue.ts` hook — the latter
is shared because Phase 3's builder media step also needs it, and cross-feature imports
are forbidden.

**Tech Stack:** Next.js 14 (App Router), Prisma 6, PostgreSQL (Supabase in production,
PGlite for local dev via `pnpm db:local`), `sharp` (new dependency) for image
processing, Supabase Storage for object storage, Zod for search-criteria parsing,
Vitest for unit tests, plain `XMLHttpRequest` (not `fetch`) for upload progress.

## Global Constraints

- Zero cross-feature imports: `features/media-library` and `features/invitation-builder`
  never import from each other. Anything both need lives in `services/`, `lib/`, or
  `components/`.
- `services/media` imports no feature and is the only module Ph5/Ph6/future consumers
  ever call (design spec, "API contract for future consumers").
- Every server-only module (anything touching Prisma or Supabase Storage directly)
  starts with `import "server-only";`, matching every existing file in
  `services/media/`, `services/upload/`, and `lib/auth/session.ts`.
- No new tables. Folders are computed, not stored. No version-history table. No
  variants table (design Decision 1, 2, 4).
- `MediaAsset.width IS NOT NULL` is the sole signal that thumbnail/preview variants
  exist for an asset — never a new boolean column.
- Image upload accepts JPG/JPEG/PNG/WEBP/HEIC only, per existing
  `services/upload/constraints.ts` — unchanged this phase. No SVG, ever (stored-XSS
  risk without a sanitizer).
- All Prisma-backed functions degrade gracefully when `isDatabaseConfigured()` is
  false (return empty/null, never throw) — matches every existing service in this
  codebase, since CI builds without secrets.
- The upload route handler and the serving proxy both run in the Node.js runtime
  (never Edge) — `sharp` is a native binary and Supabase's server client needs Node
  APIs.
- Every new private image URL embeds `version` in its path and is served with
  `Cache-Control: private, max-age=31536000, immutable` — never a bare Supabase signed
  URL handed to the browser for library-managed images.
- No test may require a live database or a live Supabase project to pass in CI. Pure
  logic (paths, processing, folders, criteria, query) gets Vitest unit tests. Anything
  that only makes sense against a real Postgres (repository CRUD, route handlers, full
  upload → serve round trip) is verified manually via `pnpm db:local`, per this
  codebase's established pattern (Phases 2–3 did the same for their Prisma-backed
  modules).

---

## File Structure

```
prisma/
  schema.prisma                                    (modify)
  migrations/<ts>_phase4_media_library/migration.sql (create)

services/media/
  types.ts          (create) — shared types: AssetRow, MediaVariant, result unions
  paths.ts          (create) — pure: object-path builder, variant-exists check
  processing.ts     (create) — sharp: thumbnail/preview generation
  folders.ts        (create) — pure: by-event / by-type virtual folder computation
  criteria.ts        (create) — Zod: search criteria parsing (mirrors template-marketplace)
  query.ts          (create) — pure: Prisma where/orderBy/pagination builders
  storage.ts        (create) — multi-object write/remove over services/upload/storage
  repository.ts     (create) — Prisma CRUD (DB-backed, no unit tests)
  index.ts          (modify) — public barrel: createAsset, replaceAsset, deleteAsset,
                                 searchAssets, getAsset, getFolders, getQuota, variant URLs

app/api/media/
  upload/route.ts                              (create) — POST, one file per request
  [assetId]/[version]/[variant]/route.ts       (create) — GET, authenticated serving

lib/hooks/
  use-upload-queue.ts   (create) — shared XHR-based upload queue (progress/retry/cancel)

components/media/
  asset-card.tsx        (create)
  asset-grid.tsx        (create)
  upload-dropzone.tsx   (create)
  asset-detail-sheet.tsx (create)

features/media-library/
  actions.ts    (create) — thin Server Actions: replace, delete, update metadata
  browser.tsx   (create) — client composition: search, view switcher, quota, grid

app/(dashboard)/dashboard/media/page.tsx   (modify) — real Asset Browser, flag-gated

features/invitation-builder/
  components/steps/media-step.tsx   (modify) — browse full library, not a flat list
  media-actions.ts                  (modify) — thin wrapper stays, gains searchAssets read

CHANGELOG.md   (modify) — Phase 4 entry under [Unreleased]
```

---

### Task 1: Schema changes — `tags`, `version`, `VIDEO`

**Files:**
- Modify: `prisma/schema.prisma:361-417` (the `MediaKind` enum and `MediaAsset` model)
- Create: `prisma/migrations/<timestamp>_phase4_media_library/migration.sql` (generated,
  see steps below — do not hand-write the timestamp)

**Interfaces:**
- Produces: `MediaAsset.tags: string[]`, `MediaAsset.version: number`, and
  `MediaKind.VIDEO` — every later task in this plan reads or writes these.

- [ ] **Step 1: Edit the enum and model**

In `prisma/schema.prisma`, change:

```prisma
enum MediaKind {
  IMAGE
  DOCUMENT
  AUDIO
}
```

to:

```prisma
enum MediaKind {
  IMAGE
  DOCUMENT
  AUDIO
  /// Ph4.md §1/§4 mark video future-ready, same treatment as MediaSlot.MUSIC in
  /// Phase 3. No processing pipeline exists behind this value yet — Decision 4
  /// in the Ph4 design doc scopes upload to images only this phase.
  VIDEO
}
```

And change the `MediaAsset` model's field block from:

```prisma
  kind             MediaKind
  mimeType         String
  bytes            Int
  originalFilename String
  /// Accessibility text. Nullable because it is supplied later in the flow, but
  /// the website and PDF generators both require it before publishing.
  altText          String?
  /// Intrinsic dimensions, when known. Null for audio and documents.
  width            Int?
  height           Int?
```

to:

```prisma
  kind             MediaKind
  mimeType         String
  bytes            Int
  originalFilename String
  /// Accessibility text. Nullable because it is supplied later in the flow, but
  /// the website and PDF generators both require it before publishing.
  altText          String?
  /// Free-text organizational labels — Ph4.md §6 metadata, §8 search, and the
  /// "by type" virtual folder view (design doc Decision 1) all read this one
  /// field. Not validated against a fixed vocabulary; unlike Template.tags this
  /// is customer-authored, not curated catalog data.
  tags             String[] @default([])
  /// Bumped on every Replace Asset (Ph4.md §10). Embedded in served URLs so a
  /// stale cached URL is provably stale rather than silently wrong — see the
  /// design doc's "Why the version belongs in the URL path".
  version          Int      @default(1)
  /// Intrinsic dimensions, when known. Null for audio, documents, and any image
  /// whose thumbnail/preview generation failed (design doc Decision 4). This is
  /// also the sole signal that variants exist for this asset — see
  /// services/media/paths.ts `hasVariants`.
  width            Int?
  height           Int?
```

- [ ] **Step 2: Start the local dev database**

Run in a separate terminal (leave it running):

```bash
pnpm db:local
```

Expected: PGlite starts listening on `127.0.0.1:55432`.

- [ ] **Step 3: Generate the migration against it**

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:55432/postgres?pgbouncer=true&connection_limit=1" pnpm prisma:migrate --name phase4_media_library
```

Expected: Prisma detects the two additive column changes and the enum value,
prints `Applying migration ...`, and exits 0 without prompting — the change set is
purely additive (new nullable-free columns with defaults, one new enum value), so
there is no destructive-change question for it to ask. A new folder appears under
`prisma/migrations/` containing `migration.sql`. If it prompts instead, stop and
inspect the diff before answering — do not blindly accept a prompt suggesting a
column drop.

- [ ] **Step 4: Read the generated SQL and confirm it matches intent**

Open the new `prisma/migrations/<timestamp>_phase4_media_library/migration.sql`.
Expect an `ALTER TYPE "MediaKind" ADD VALUE 'VIDEO'` (or equivalent) and an
`ALTER TABLE "media_assets" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT '{}'` plus
`ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1`. No `DROP` statements should
appear.

- [ ] **Step 5: Regenerate the Prisma client**

```bash
pnpm prisma:generate
```

Expected: exits 0. `node_modules/@prisma/client` now types `tags: string[]`,
`version: number`, and `MediaKind.VIDEO`.

- [ ] **Step 6: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(media): add tags, version, and VIDEO kind to MediaAsset"
```

---

### Task 2: `sharp` dependency + `services/media/types.ts` + `services/media/paths.ts`

**Files:**
- Modify: `package.json` (add dependency)
- Create: `services/media/types.ts`
- Create: `services/media/paths.ts`
- Test: `services/media/paths.test.ts`

**Interfaces:**
- Produces: `MediaVariant` (`"original" | "thumbnail" | "preview"`), `AssetRow`
  interface, `assetObjectPath(profileId, assetId, version, variant,
  originalExtension)`, `hasVariants(asset)` — every later `services/media/*` file
  and both route handlers import from here.

- [ ] **Step 1: Add the dependency**

```bash
pnpm add sharp
```

Expected: `package.json` gains `"sharp": "^0.33.5"` (or whatever the installed
range resolves to) under `"dependencies"` — this is a runtime dependency, not a
dev one, since both route handlers use it in production.

- [ ] **Step 2: Write `services/media/types.ts`**

```typescript
/**
 * Shared types for the Media Library — split out so processing.ts, storage.ts,
 * repository.ts, and index.ts can all reference the same shapes without a
 * circular import back through index.ts.
 */

export type MediaVariant = "original" | "thumbnail" | "preview";

export type MediaKindValue = "IMAGE" | "DOCUMENT" | "AUDIO" | "VIDEO";

/** The subset of MediaAsset columns every service function reads or returns. */
export interface AssetRow {
  id: string;
  profileId: string;
  bucket: string;
  storagePath: string;
  kind: MediaKindValue;
  mimeType: string;
  bytes: number;
  originalFilename: string;
  altText: string | null;
  tags: string[];
  version: number;
  width: number | null;
  height: number | null;
  createdAt: Date;
}

export interface AssetUsage {
  assetId: string;
  invitationId: string;
  invitationTitle: string;
  slot: string;
}
```

- [ ] **Step 3: Write the failing test for `paths.ts`**

Create `services/media/paths.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { assetObjectPath, hasVariants } from "./paths";

describe("assetObjectPath", () => {
  it("builds the original path using the caller's extension", () => {
    expect(assetObjectPath("user-1", "asset-1", 1, "original", ".jpg")).toBe(
      "user-1/asset-1/v1/original.jpg",
    );
  });

  it("builds thumbnail and preview paths as .webp regardless of the original extension", () => {
    expect(assetObjectPath("user-1", "asset-1", 1, "thumbnail", ".heic")).toBe(
      "user-1/asset-1/v1/thumbnail.webp",
    );
    expect(assetObjectPath("user-1", "asset-1", 1, "preview", ".heic")).toBe(
      "user-1/asset-1/v1/preview.webp",
    );
  });

  it("embeds the version so a replace never collides with the prior version's objects", () => {
    expect(assetObjectPath("user-1", "asset-1", 2, "original", ".png")).toBe(
      "user-1/asset-1/v2/original.png",
    );
  });
});

describe("hasVariants", () => {
  it("is true once width is known", () => {
    expect(hasVariants({ width: 800 })).toBe(true);
  });

  it("is false when width is null — the graceful-degradation signal", () => {
    expect(hasVariants({ width: null })).toBe(false);
  });
});
```

- [ ] **Step 4: Run it and confirm it fails**

```bash
pnpm test:watch --run services/media/paths.test.ts
```

Expected: FAIL — `Cannot find module './paths'`.

- [ ] **Step 5: Write `services/media/paths.ts`**

```typescript
import type { MediaVariant } from "./types";

/**
 * Pure storage-path builder for media objects — no I/O, so it is trivially
 * unit-testable and is the single place that decides the on-disk layout.
 *
 * Layout: `{profileId}/{assetId}/v{version}/{variant}.{ext}`. The version segment
 * is what makes `Cache-Control: immutable` safe (design doc Decision 4): a given
 * triple's bytes never change, because Replace always writes to `v{version + 1}`
 * and only deletes the old version's objects once the new ones are confirmed
 * written.
 */

const GENERATED_VARIANT_EXTENSION = ".webp";

export function assetObjectPath(
  profileId: string,
  assetId: string,
  version: number,
  variant: MediaVariant,
  originalExtension: string,
): string {
  const extension =
    variant === "original" ? originalExtension : GENERATED_VARIANT_EXTENSION;
  return `${profileId}/${assetId}/v${version}/${variant}${extension}`;
}

/**
 * The sole signal that thumbnail/preview variants exist for an asset (design
 * doc Decision 4) — there is no variants table, so this is derived from a field
 * populated only on a successful `sharp` decode. Callers building a thumbnail or
 * preview URL must check this first and fall back to `"original"` when false,
 * rather than requesting a variant path and handling a storage 404.
 */
export function hasVariants(asset: { width: number | null }): boolean {
  return asset.width !== null;
}
```

- [ ] **Step 6: Run the test again and confirm it passes**

```bash
pnpm test:watch --run services/media/paths.test.ts
```

Expected: PASS — 6 tests.

- [ ] **Step 7: Commit**

```bash
git add package.json pnpm-lock.yaml services/media/types.ts services/media/paths.ts services/media/paths.test.ts
git commit -m "feat(media): add sharp dependency and media object path builder"
```

---

### Task 3: `services/media/processing.ts` — thumbnail/preview generation

**Files:**
- Create: `services/media/processing.ts`
- Test: `services/media/processing.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks (pure function of a `Buffer`).
- Produces: `ProcessedImage` (`{ width, height, thumbnail, preview }`),
  `processImage(input: Buffer): Promise<ProcessedImage | null>` — Task 10
  (`services/media/index.ts`) calls this inside `createAsset`/`replaceAsset`.

- [ ] **Step 1: Write the failing test**

Create `services/media/processing.test.ts`. `sharp`'s `create` input generates a
synthetic image in-memory, so this test needs no fixture file:

```typescript
import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { processImage } from "./processing";

async function syntheticPng(width: number, height: number): Promise<Buffer> {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 200, g: 100, b: 50 },
    },
  })
    .png()
    .toBuffer();
}

describe("processImage", () => {
  it("reads intrinsic dimensions from the decode", async () => {
    const input = await syntheticPng(800, 600);
    const result = await processImage(input);
    expect(result?.width).toBe(800);
    expect(result?.height).toBe(600);
  });

  it("generates a thumbnail no larger than 320px on its longest edge", async () => {
    const input = await syntheticPng(2000, 1000);
    const result = await processImage(input);
    const meta = await sharp(result!.thumbnail.buffer).metadata();
    expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(320);
    expect(meta.format).toBe("webp");
  });

  it("generates a preview no larger than 1280px on its longest edge", async () => {
    const input = await syntheticPng(3000, 1500);
    const result = await processImage(input);
    const meta = await sharp(result!.preview.buffer).metadata();
    expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(1280);
    expect(meta.format).toBe("webp");
  });

  it("never upscales a source smaller than the target size", async () => {
    const input = await syntheticPng(100, 80);
    const result = await processImage(input);
    const meta = await sharp(result!.thumbnail.buffer).metadata();
    expect(meta.width).toBe(100);
    expect(meta.height).toBe(80);
  });

  it("returns null for undecodable input rather than throwing — the graceful-degradation path", async () => {
    const garbage = Buffer.from("this is not an image");
    await expect(processImage(garbage)).resolves.toBeNull();
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
pnpm test:watch --run services/media/processing.test.ts
```

Expected: FAIL — `Cannot find module './processing'`.

- [ ] **Step 3: Write `services/media/processing.ts`**

```typescript
import sharp from "sharp";

/**
 * Image processing — design doc Decision 4's "Processing pipeline" section.
 *
 * Pure with respect to the outside world: takes bytes, returns bytes, no
 * storage or database access, so it is unit-testable with synthetic images and
 * needs neither a fixture file nor a database.
 *
 * Re-encoding to WebP is what strips EXIF/GPS metadata (design doc §5) — a side
 * effect of generating the thumbnail, not a separate step.
 */

const THUMBNAIL_LONGEST_EDGE = 320;
const PREVIEW_LONGEST_EDGE = 1280;
const WEBP_QUALITY = 82;

export interface ProcessedVariant {
  buffer: Buffer;
  contentType: "image/webp";
}

export interface ProcessedImage {
  width: number;
  height: number;
  thumbnail: ProcessedVariant;
  preview: ProcessedVariant;
}

async function resizeToWebp(
  input: Buffer,
  longestEdge: number,
): Promise<Buffer> {
  return sharp(input)
    .resize({
      width: longestEdge,
      height: longestEdge,
      fit: "inside",
      // A phone photo already smaller than the target must not be blown up —
      // that would manufacture detail that was never in the original.
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();
}

/**
 * Generate thumbnail and preview variants for an uploaded image.
 *
 * Returns null when the input can't be decoded — HEIC support depends on the
 * `sharp` build (design doc's "Known, currently-unresolved format-support
 * gap"). Callers must treat null as "keep the original, skip variants," never
 * as a reason to fail the whole upload.
 */
export async function processImage(
  input: Buffer,
): Promise<ProcessedImage | null> {
  try {
    const metadata = await sharp(input).metadata();
    if (!metadata.width || !metadata.height) return null;

    const [thumbnail, preview] = await Promise.all([
      resizeToWebp(input, THUMBNAIL_LONGEST_EDGE),
      resizeToWebp(input, PREVIEW_LONGEST_EDGE),
    ]);

    return {
      width: metadata.width,
      height: metadata.height,
      thumbnail: { buffer: thumbnail, contentType: "image/webp" },
      preview: { buffer: preview, contentType: "image/webp" },
    };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run the test again and confirm it passes**

```bash
pnpm test:watch --run services/media/processing.test.ts
```

Expected: PASS — 5 tests. (This step performs real image encoding, so it is
slower than the rest of the suite; that is expected, not a sign of a hang.)

- [ ] **Step 5: Commit**

```bash
git add services/media/processing.ts services/media/processing.test.ts
git commit -m "feat(media): generate thumbnail/preview variants with sharp"
```

---

### Task 4: `services/media/folders.ts` — computed virtual folders

**Files:**
- Create: `services/media/folders.ts`
- Test: `services/media/folders.test.ts`

**Interfaces:**
- Consumes: `AssetUsage` from `services/media/types.ts` (Task 2).
- Produces: `computeByEvent(assetIds, usages)`, `computeByType(assets)`,
  `ByEventView`, `ByTypeView` — Task 10's `getFolders()` and Task 18's
  `features/media-library/browser.tsx` view switcher both consume these.

- [ ] **Step 1: Write the failing test**

Create `services/media/folders.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { computeByEvent, computeByType } from "./folders";

describe("computeByEvent", () => {
  it("groups an asset under every invitation that references it", () => {
    const view = computeByEvent(
      ["asset-1", "asset-2"],
      [
        {
          assetId: "asset-1",
          invitationId: "inv-1",
          invitationTitle: "Ana & Ben",
          slot: "COVER",
        },
      ],
    );

    expect(view.events).toHaveLength(1);
    expect(view.events[0]).toMatchObject({
      invitationId: "inv-1",
      title: "Ana & Ben",
    });
    expect(view.events[0].bySlot.COVER).toEqual(["asset-1"]);
    expect(view.unsorted).toEqual(["asset-2"]);
  });

  it("puts one asset in two events when two invitations reference it — Ph4.md §9", () => {
    const view = computeByEvent(
      ["asset-1"],
      [
        {
          assetId: "asset-1",
          invitationId: "inv-1",
          invitationTitle: "Ana & Ben",
          slot: "COVER",
        },
        {
          assetId: "asset-1",
          invitationId: "inv-2",
          invitationTitle: "Debut — Carla",
          slot: "LOGO",
        },
      ],
    );

    expect(view.events).toHaveLength(2);
    expect(view.unsorted).toEqual([]);
  });

  it("sub-groups by slot within one event", () => {
    const view = computeByEvent(
      ["asset-1", "asset-2"],
      [
        {
          assetId: "asset-1",
          invitationId: "inv-1",
          invitationTitle: "Ana & Ben",
          slot: "COUPLE",
        },
        {
          assetId: "asset-2",
          invitationId: "inv-1",
          invitationTitle: "Ana & Ben",
          slot: "COUPLE",
        },
      ],
    );

    expect(view.events[0].bySlot.COUPLE).toEqual(["asset-1", "asset-2"]);
  });

  it("returns every asset unsorted when nothing references any of them", () => {
    const view = computeByEvent(["asset-1", "asset-2"], []);
    expect(view.events).toEqual([]);
    expect(view.unsorted).toEqual(["asset-1", "asset-2"]);
  });
});

describe("computeByType", () => {
  it("groups by tag, an asset appearing under each of its tags", () => {
    const view = computeByType([
      { id: "asset-1", tags: ["logo", "corporate"] },
      { id: "asset-2", tags: ["logo"] },
    ]);

    expect(view.tags.logo).toEqual(["asset-1", "asset-2"]);
    expect(view.tags.corporate).toEqual(["asset-1"]);
    expect(view.untagged).toEqual([]);
  });

  it("puts an asset with no tags in untagged", () => {
    const view = computeByType([{ id: "asset-1", tags: [] }]);
    expect(view.untagged).toEqual(["asset-1"]);
    expect(view.tags).toEqual({});
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
pnpm test:watch --run services/media/folders.test.ts
```

Expected: FAIL — `Cannot find module './folders'`.

- [ ] **Step 3: Write `services/media/folders.ts`**

```typescript
import type { AssetUsage } from "./types";

/**
 * Virtual folder computation — design doc Decision 1.
 *
 * Folders are views computed at read time, never a stored `Folder` table:
 * Ph4.md §2 wants assets "automatically organized by Event," but §9 requires
 * that one asset may be referenced by many invitations, which a single-owner
 * folder model cannot express. This module takes a flat asset pool plus the
 * usage join and produces the two views the Asset Browser's view switcher
 * offers — "By Event" and "By Type" — without ever writing anything down.
 */

export interface EventFolder {
  invitationId: string;
  title: string;
  /** MediaSlot value -> ordered asset ids referenced in that slot for this event. */
  bySlot: Record<string, string[]>;
  /** Every asset id referenced anywhere in this event, deduplicated. */
  assetIds: string[];
}

export interface ByEventView {
  events: EventFolder[];
  /** Asset ids referenced by no invitation at all. */
  unsorted: string[];
}

export function computeByEvent(
  assetIds: string[],
  usages: AssetUsage[],
): ByEventView {
  const eventsById = new Map<string, EventFolder>();
  const referenced = new Set<string>();

  for (const usage of usages) {
    referenced.add(usage.assetId);

    let folder = eventsById.get(usage.invitationId);
    if (!folder) {
      folder = {
        invitationId: usage.invitationId,
        title: usage.invitationTitle,
        bySlot: {},
        assetIds: [],
      };
      eventsById.set(usage.invitationId, folder);
    }

    if (!folder.bySlot[usage.slot]) folder.bySlot[usage.slot] = [];
    if (!folder.bySlot[usage.slot].includes(usage.assetId)) {
      folder.bySlot[usage.slot].push(usage.assetId);
    }
    if (!folder.assetIds.includes(usage.assetId)) {
      folder.assetIds.push(usage.assetId);
    }
  }

  return {
    events: [...eventsById.values()],
    unsorted: assetIds.filter((id) => !referenced.has(id)),
  };
}

export interface ByTypeView {
  /** tag -> asset ids carrying it. */
  tags: Record<string, string[]>;
  /** Asset ids carrying no tags at all. */
  untagged: string[];
}

export function computeByType(
  assets: { id: string; tags: string[] }[],
): ByTypeView {
  const tags: Record<string, string[]> = {};
  const untagged: string[] = [];

  for (const asset of assets) {
    if (asset.tags.length === 0) {
      untagged.push(asset.id);
      continue;
    }
    for (const tag of asset.tags) {
      if (!tags[tag]) tags[tag] = [];
      tags[tag].push(asset.id);
    }
  }

  return { tags, untagged };
}
```

- [ ] **Step 4: Run the test again and confirm it passes**

```bash
pnpm test:watch --run services/media/folders.test.ts
```

Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add services/media/folders.ts services/media/folders.test.ts
git commit -m "feat(media): compute by-event and by-type virtual folders"
```

---

### Task 5: `services/media/criteria.ts` — search criteria parsing

**Files:**
- Create: `services/media/criteria.ts`
- Test: `services/media/criteria.test.ts`

Mirrors `features/template-marketplace/criteria.ts` exactly in shape (design doc,
"Folders, search, and quota" section) — same `multi`/`known` pattern, applied to
media's own vocabulary instead of the template catalog's.

**Interfaces:**
- Produces: `MediaCriteria`, `MediaSort`, `MediaKindFilter`, `DEFAULT_MEDIA_SORT`,
  `DEFAULT_MEDIA_PAGE_SIZE`, `MAX_MEDIA_PAGE_SIZE`, `parseMediaCriteria(params)` —
  Task 6 (`query.ts`) and Task 17/18 (page + browser) all consume this.

- [ ] **Step 1: Write the failing test**

Create `services/media/criteria.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { parseMediaCriteria, DEFAULT_MEDIA_SORT, DEFAULT_MEDIA_PAGE_SIZE, MAX_MEDIA_PAGE_SIZE } from "./criteria";

describe("parseMediaCriteria", () => {
  it("defaults to no filters, newest sort, page 1", () => {
    const criteria = parseMediaCriteria({});
    expect(criteria.q).toBeUndefined();
    expect(criteria.kind).toEqual([]);
    expect(criteria.tag).toEqual([]);
    expect(criteria.event).toBeUndefined();
    expect(criteria.sort).toBe(DEFAULT_MEDIA_SORT);
    expect(criteria.page).toBe(1);
    expect(criteria.perPage).toBe(DEFAULT_MEDIA_PAGE_SIZE);
  });

  it("normalises repeated kind params into a deduped lowercase array", () => {
    const criteria = parseMediaCriteria({ kind: ["IMAGE", "image", "document"] });
    expect(criteria.kind).toEqual(["image", "document"]);
  });

  it("drops an unknown kind rather than erroring", () => {
    const criteria = parseMediaCriteria({ kind: "video,sculpture" });
    expect(criteria.kind).toEqual(["video"]);
  });

  it("falls back to a valid default for a bad page number", () => {
    expect(parseMediaCriteria({ page: "-3" }).page).toBe(1);
    expect(parseMediaCriteria({ page: "banana" }).page).toBe(1);
  });

  it("clamps perPage to the maximum", () => {
    expect(parseMediaCriteria({ perPage: "100000" }).perPage).toBe(MAX_MEDIA_PAGE_SIZE);
  });

  it("falls back to the default sort for an unrecognised value", () => {
    expect(parseMediaCriteria({ sort: "biggest-first" }).sort).toBe(DEFAULT_MEDIA_SORT);
  });

  it("passes through a recognised sort", () => {
    expect(parseMediaCriteria({ sort: "largest" }).sort).toBe("largest");
  });

  it("passes through a single event filter", () => {
    expect(parseMediaCriteria({ event: "inv-1" }).event).toBe("inv-1");
  });

  it("trims and length-caps a free-text query", () => {
    const long = "a".repeat(500);
    expect(parseMediaCriteria({ q: `  ${long}  ` }).q).toHaveLength(100);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
pnpm test:watch --run services/media/criteria.test.ts
```

Expected: FAIL — `Cannot find module './criteria'`.

- [ ] **Step 3: Write `services/media/criteria.ts`**

```typescript
import { z } from "zod";

/**
 * Media search criteria — design doc "Folders, search, and quota" section.
 * Same shape as features/template-marketplace/criteria.ts, applied to the
 * Media Library's own vocabulary. Pure — no Prisma, no React — so the whole
 * filter surface is unit-testable without a database.
 */

export const MEDIA_SORTS = ["newest", "oldest", "largest", "name"] as const;
export type MediaSort = (typeof MEDIA_SORTS)[number];

export const MEDIA_KINDS = ["image", "document", "audio", "video"] as const;
export type MediaKindFilter = (typeof MEDIA_KINDS)[number];

export const DEFAULT_MEDIA_SORT: MediaSort = "newest";
export const DEFAULT_MEDIA_PAGE_SIZE = 40;
export const MAX_MEDIA_PAGE_SIZE = 100;

/** A search term longer than this is not a search, it is a payload. */
const MAX_SEARCH_LENGTH = 100;

/** Repeatable params, normalised to a deduped lowercase array — see criteria.ts's twin in template-marketplace. */
const multi = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((value) => {
    if (value === undefined) return [];
    const list = Array.isArray(value) ? value : [value];
    const cleaned = list
      .flatMap((item) => item.split(","))
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    return [...new Set(cleaned)];
  });

function known<T extends string>(allowed: readonly T[]) {
  return (values: string[]): T[] =>
    values.filter((v): v is T => (allowed as readonly string[]).includes(v));
}

const single = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .transform((v) => (Array.isArray(v) ? v[0] : v));

export const mediaCriteriaSchema = z.object({
  /** Filename, alt text, and tags — design doc's Search section. */
  q: z
    .string()
    .optional()
    .transform((v) => v?.trim().slice(0, MAX_SEARCH_LENGTH) || undefined),

  kind: multi.transform(known(MEDIA_KINDS)),
  tag: multi,

  /** An invitation id, or the literal string "unsorted" for zero-usage assets. */
  event: single,

  sort: single.transform((v): MediaSort =>
    (MEDIA_SORTS as readonly string[]).includes(v ?? "")
      ? (v as MediaSort)
      : DEFAULT_MEDIA_SORT,
  ),

  page: single.transform((v) => {
    const parsed = Number.parseInt(v ?? "1", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  }),

  perPage: single.transform((v) => {
    const parsed = Number.parseInt(v ?? "", 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return DEFAULT_MEDIA_PAGE_SIZE;
    return Math.min(parsed, MAX_MEDIA_PAGE_SIZE);
  }),
});

export type MediaCriteria = z.infer<typeof mediaCriteriaSchema>;

export type RawSearchParams = Record<string, string | string[] | undefined>;

/** Never throws — every field has a fallback, same guarantee as the marketplace's parseCriteria. */
export function parseMediaCriteria(params: RawSearchParams): MediaCriteria {
  const result = mediaCriteriaSchema.safeParse(params);
  if (result.success) return result.data;
  return mediaCriteriaSchema.parse({});
}
```

- [ ] **Step 4: Run the test again and confirm it passes**

```bash
pnpm test:watch --run services/media/criteria.test.ts
```

Expected: PASS — 9 tests.

- [ ] **Step 5: Commit**

```bash
git add services/media/criteria.ts services/media/criteria.test.ts
git commit -m "feat(media): add search criteria parsing"
```

---

### Task 6: `services/media/query.ts` — criteria → Prisma query

**Files:**
- Create: `services/media/query.ts`
- Test: `services/media/query.test.ts`

Mirrors `features/template-marketplace/query.ts`'s `buildWhere`/`buildOrderBy`
pattern, applied to `MediaAsset`.

**Interfaces:**
- Consumes: `MediaCriteria`, `MediaSort` from Task 5.
- Produces: `buildMediaWhere(criteria, opts)`, `buildMediaOrderBy(sort)`,
  `buildMediaPagination(criteria)` — Task 9 (`repository.ts`) is the only
  consumer.

- [ ] **Step 1: Write the failing test**

Create `services/media/query.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { parseMediaCriteria } from "./criteria";
import { buildMediaWhere, buildMediaOrderBy, buildMediaPagination } from "./query";

describe("buildMediaWhere", () => {
  it("always scopes to the caller's profile", () => {
    const where = buildMediaWhere(parseMediaCriteria({}), { profileId: "user-1" });
    expect(where.AND).toContainEqual({ profileId: "user-1" });
  });

  it("adds a kind filter mapped to the Prisma enum", () => {
    const where = buildMediaWhere(parseMediaCriteria({ kind: "image,document" }), {
      profileId: "user-1",
    });
    expect(where.AND).toContainEqual({ kind: { in: ["IMAGE", "DOCUMENT"] } });
  });

  it("adds a hasSome tag filter", () => {
    const where = buildMediaWhere(parseMediaCriteria({ tag: "logo" }), {
      profileId: "user-1",
    });
    expect(where.AND).toContainEqual({ tags: { hasSome: ["logo"] } });
  });

  it("filters to assets with zero usages for the 'unsorted' event value", () => {
    const where = buildMediaWhere(parseMediaCriteria({ event: "unsorted" }), {
      profileId: "user-1",
    });
    expect(where.AND).toContainEqual({ usages: { none: {} } });
  });

  it("filters to one invitation's usages for a real event id", () => {
    const where = buildMediaWhere(parseMediaCriteria({ event: "inv-1" }), {
      profileId: "user-1",
    });
    expect(where.AND).toContainEqual({
      usages: { some: { invitationId: "inv-1" } },
    });
  });

  it("searches filename, alt text, and tags for a free-text query", () => {
    const where = buildMediaWhere(parseMediaCriteria({ q: "beach" }), {
      profileId: "user-1",
    });
    const clause = where.AND?.find((c: any) => c.AND) as any;
    expect(clause.AND[0].OR).toEqual([
      { originalFilename: { contains: "beach", mode: "insensitive" } },
      { altText: { contains: "beach", mode: "insensitive" } },
      { tags: { has: "beach" } },
    ]);
  });
});

describe("buildMediaOrderBy", () => {
  it("orders newest first by default, with a unique tiebreaker", () => {
    expect(buildMediaOrderBy("newest")).toEqual([
      { createdAt: "desc" },
      { id: "asc" },
    ]);
  });

  it("orders by size for 'largest'", () => {
    expect(buildMediaOrderBy("largest")).toEqual([
      { bytes: "desc" },
      { id: "asc" },
    ]);
  });

  it("orders alphabetically for 'name'", () => {
    expect(buildMediaOrderBy("name")).toEqual([
      { originalFilename: "asc" },
      { id: "asc" },
    ]);
  });
});

describe("buildMediaPagination", () => {
  it("computes skip/take from page and perPage", () => {
    const criteria = parseMediaCriteria({ page: "3", perPage: "20" });
    expect(buildMediaPagination(criteria)).toEqual({ skip: 40, take: 20 });
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
pnpm test:watch --run services/media/query.test.ts
```

Expected: FAIL — `Cannot find module './query'`.

- [ ] **Step 3: Write `services/media/query.ts`**

```typescript
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
```

- [ ] **Step 4: Run the test again and confirm it passes**

```bash
pnpm test:watch --run services/media/query.test.ts
```

Expected: PASS — 10 tests.

- [ ] **Step 5: Commit**

```bash
git add services/media/query.ts services/media/query.test.ts
git commit -m "feat(media): build Prisma where/orderBy from search criteria"
```

---

### Task 7: `services/media/storage.ts` — multi-object write/remove

**Files:**
- Create: `services/media/storage.ts`

No test file for this task. It is a thin wrapper over
`services/upload/storage.ts`, which itself has no unit tests in this codebase —
Supabase Storage calls are verified against a real project via `pnpm db:local` +
manual upload (Task 19), matching the existing convention (no test file exists
for `services/upload/storage.ts` either, only for the pure `validation.ts`).

**Interfaces:**
- Consumes: `uploadFile`, `removeFile`, `BUCKETS` from `services/upload/storage.ts`
  (existing); `MediaVariant` from Task 2.
- Produces: `writeAssetObjects(writes)`, `removeAssetObjects(paths)` — Task 9
  (`index.ts`) is the only consumer.

- [ ] **Step 1: Write `services/media/storage.ts`**

```typescript
import "server-only";

import { uploadFile, removeFile, BUCKETS } from "@/services/upload/storage";
import type { MediaVariant } from "./types";

/**
 * Multi-object storage writes for one asset's original + generated variants —
 * design doc's processing pipeline step 4 ("Write original + both derivatives
 * to storage"). Built on services/upload/storage.ts rather than reaching for
 * Supabase directly, per Ph1.md §8 ("future modules will reuse this service").
 */

export interface AssetObjectWrite {
  variant: MediaVariant;
  path: string;
  buffer: Buffer;
  contentType: string;
}

export type WriteAssetObjectsResult =
  | { ok: true }
  | { ok: false; error: string; written: string[] };

/**
 * Writes each object in order, stopping at the first failure. Returns which
 * paths landed even on failure, so a caller can clean up exactly those objects
 * rather than guess — the orphan-prevention pattern createAsset already used
 * in Phase 3, extended here from one object to up to three.
 */
export async function writeAssetObjects(
  writes: AssetObjectWrite[],
): Promise<WriteAssetObjectsResult> {
  const written: string[] = [];

  for (const write of writes) {
    const filename = write.path.split("/").pop() ?? "asset";
    const file = new File([write.buffer], filename, {
      type: write.contentType,
    });

    const result = await uploadFile({
      bucket: BUCKETS.media,
      path: write.path,
      file,
      kind: "image",
      upsert: true,
    });

    if ("code" in result) {
      return { ok: false, error: result.message, written };
    }
    written.push(write.path);
  }

  return { ok: true };
}

/**
 * Best-effort cleanup. An orphaned file costs a few kilobytes and no user ever
 * sees it — removeFile already logs its own failures, so a failed cleanup must
 * never surface as this operation's own error.
 */
export async function removeAssetObjects(paths: string[]): Promise<void> {
  await Promise.all(paths.map((path) => removeFile(BUCKETS.media, path)));
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add services/media/storage.ts
git commit -m "feat(media): write and remove an asset's variant objects together"
```

---

### Task 8: `services/media/repository.ts` — Prisma CRUD

**Files:**
- Create: `services/media/repository.ts`

No test file. Prisma-backed, like every other repository in this codebase
(`features/invitation-builder/repository.ts`, `features/template-marketplace/
repository.ts`) — none have unit tests; all are verified against a real Postgres
via `pnpm db:local` (Task 19).

**Interfaces:**
- Consumes: `MediaCriteria`, `buildMediaWhere`, `buildMediaOrderBy`,
  `buildMediaPagination` (Tasks 5–6); `AssetRow`, `AssetUsage`, `MediaKindValue`
  (Task 2).
- Produces: `insertAsset`, `findAssetById`, `searchAssets`, `listAllAssets`,
  `findUsagesForProfile`, `bumpVersionAndUpdate`, `updateAssetMeta`,
  `deleteAssetRow`, `findBlockingUsages`, `getQuota`, `Quota`, `QuotaByEvent` —
  Task 9 (`index.ts`) is the only consumer.

- [ ] **Step 1: Write `services/media/repository.ts`**

```typescript
import "server-only";

import { prisma, isDatabaseConfigured } from "@/lib/db";
import { logger } from "@/lib/logger";
import type { MediaCriteria } from "./criteria";
import {
  buildMediaWhere,
  buildMediaOrderBy,
  buildMediaPagination,
} from "./query";
import type { AssetRow, AssetUsage, MediaKindValue } from "./types";

/**
 * Prisma CRUD for MediaAsset/InvitationMedia. Every read degrades to an empty
 * result when the database isn't configured, matching every other repository
 * in this codebase (features/template-marketplace/repository.ts, etc.) —
 * `next build` runs without secrets, so a module that throws on import-time
 * absence of DATABASE_URL would fail CI.
 */

const ASSET_SELECT = {
  id: true,
  profileId: true,
  bucket: true,
  storagePath: true,
  kind: true,
  mimeType: true,
  bytes: true,
  originalFilename: true,
  altText: true,
  tags: true,
  version: true,
  width: true,
  height: true,
  createdAt: true,
} as const;

export interface InsertAssetInput {
  id: string;
  profileId: string;
  bucket: string;
  storagePath: string;
  kind: MediaKindValue;
  mimeType: string;
  bytes: number;
  originalFilename: string;
  altText: string | null;
  tags: string[];
  width: number | null;
  height: number | null;
}

export async function insertAsset(data: InsertAssetInput): Promise<AssetRow> {
  return prisma.mediaAsset.create({ data, select: ASSET_SELECT });
}

export async function findAssetById(
  profileId: string,
  assetId: string,
): Promise<AssetRow | null> {
  if (!isDatabaseConfigured()) return null;
  return prisma.mediaAsset.findFirst({
    where: { id: assetId, profileId },
    select: ASSET_SELECT,
  });
}

export async function searchAssets(
  profileId: string,
  criteria: MediaCriteria,
): Promise<{ assets: AssetRow[]; totalCount: number }> {
  if (!isDatabaseConfigured()) return { assets: [], totalCount: 0 };

  try {
    const where = buildMediaWhere(criteria, { profileId });
    const orderBy = buildMediaOrderBy(criteria.sort);
    const { skip, take } = buildMediaPagination(criteria);

    const [assets, totalCount] = await Promise.all([
      prisma.mediaAsset.findMany({
        where,
        orderBy,
        skip,
        take,
        select: ASSET_SELECT,
      }),
      prisma.mediaAsset.count({ where }),
    ]);

    return { assets, totalCount };
  } catch (error) {
    logger.report(error, { at: "searchAssets", profileId });
    return { assets: [], totalCount: 0 };
  }
}

/** Every asset for a profile, uncapped by pagination — folder computation (services/media/folders.ts) needs the whole pool, not one page of it. */
export async function listAllAssets(profileId: string): Promise<AssetRow[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    return await prisma.mediaAsset.findMany({
      where: { profileId },
      orderBy: { createdAt: "desc" },
      select: ASSET_SELECT,
    });
  } catch (error) {
    logger.report(error, { at: "listAllAssets", profileId });
    return [];
  }
}

export async function findUsagesForProfile(
  profileId: string,
): Promise<AssetUsage[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    const rows = await prisma.invitationMedia.findMany({
      where: { asset: { profileId } },
      select: {
        assetId: true,
        slot: true,
        invitation: { select: { id: true, title: true } },
      },
    });

    return rows.map((row) => ({
      assetId: row.assetId,
      invitationId: row.invitation.id,
      invitationTitle: row.invitation.title,
      slot: row.slot,
    }));
  } catch (error) {
    logger.report(error, { at: "findUsagesForProfile", profileId });
    return [];
  }
}

export interface ReplaceAssetInput {
  bucket: string;
  storagePath: string;
  mimeType: string;
  bytes: number;
  originalFilename: string;
  width: number | null;
  height: number | null;
}

/** Bumps version and overwrites file metadata. The caller (index.ts replaceAsset) only removes the previous version's storage objects after this resolves. */
export async function bumpVersionAndUpdate(
  assetId: string,
  data: ReplaceAssetInput,
): Promise<AssetRow> {
  return prisma.mediaAsset.update({
    where: { id: assetId },
    data: { ...data, version: { increment: 1 } },
    select: ASSET_SELECT,
  });
}

export async function updateAssetMeta(
  profileId: string,
  assetId: string,
  data: { altText?: string | null; tags?: string[] },
): Promise<AssetRow | null> {
  if (!isDatabaseConfigured()) return null;

  const existing = await prisma.mediaAsset.findFirst({
    where: { id: assetId, profileId },
    select: { id: true },
  });
  if (!existing) return null;

  return prisma.mediaAsset.update({
    where: { id: assetId },
    data,
    select: ASSET_SELECT,
  });
}

export async function deleteAssetRow(assetId: string): Promise<void> {
  await prisma.mediaAsset.delete({ where: { id: assetId } });
}

/** Invitation titles referencing this asset — Ph4.md §11's delete-protection message. */
export async function findBlockingUsages(assetId: string): Promise<string[]> {
  if (!isDatabaseConfigured()) return [];

  const usages = await prisma.invitationMedia.findMany({
    where: { assetId },
    select: { invitation: { select: { title: true } } },
    take: 10,
  });
  return usages.map((usage) => usage.invitation.title);
}

export interface QuotaByEvent {
  invitationId: string;
  title: string;
  bytes: number;
  count: number;
}

export interface Quota {
  totalBytes: number;
  totalCount: number;
  byEvent: QuotaByEvent[];
}

/** One aggregate query overall, one grouped by event — Ph4.md §12. Display only: no enforcement, matching "future subscription plans can use this without architectural changes." */
export async function getQuota(profileId: string): Promise<Quota> {
  if (!isDatabaseConfigured()) {
    return { totalBytes: 0, totalCount: 0, byEvent: [] };
  }

  try {
    const [overall, usages] = await Promise.all([
      prisma.mediaAsset.aggregate({
        where: { profileId },
        _sum: { bytes: true },
        _count: true,
      }),
      prisma.invitationMedia.findMany({
        where: { asset: { profileId } },
        select: {
          invitation: { select: { id: true, title: true } },
          asset: { select: { id: true, bytes: true } },
        },
      }),
    ]);

    const byEvent = new Map<string, QuotaByEvent>();
    const countedPerEvent = new Map<string, Set<string>>();

    for (const usage of usages) {
      const key = usage.invitation.id;
      let bucket = byEvent.get(key);
      if (!bucket) {
        bucket = {
          invitationId: key,
          title: usage.invitation.title,
          bytes: 0,
          count: 0,
        };
        byEvent.set(key, bucket);
        countedPerEvent.set(key, new Set());
      }

      // One asset used twice in the same event (e.g. cover and gallery) must
      // count once, not twice — this is quota display, not a usage tally.
      const seen = countedPerEvent.get(key)!;
      if (!seen.has(usage.asset.id)) {
        seen.add(usage.asset.id);
        bucket.bytes += usage.asset.bytes;
        bucket.count += 1;
      }
    }

    return {
      totalBytes: overall._sum.bytes ?? 0,
      totalCount: overall._count,
      byEvent: [...byEvent.values()],
    };
  } catch (error) {
    logger.report(error, { at: "getQuota", profileId });
    return { totalBytes: 0, totalCount: 0, byEvent: [] };
  }
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm typecheck
```

Expected: exits 0. (If `MediaAsset`'s Prisma types don't yet include `tags`/
`version`, re-run `pnpm prisma:generate` from Task 1 Step 5 — the client must be
regenerated after every schema change.)

- [ ] **Step 3: Commit**

```bash
git add services/media/repository.ts
git commit -m "feat(media): add Prisma repository for search, replace, and quota"
```

---

### Task 9: `services/media/index.ts` — rewrite the public barrel

**Files:**
- Modify: `services/media/index.ts` (full rewrite — this is the file described in
  the "WHAT PHASE 4 ADDS" comment at the top of the current version)
- Modify: `features/invitation-builder/repository.ts:38-46` (add `version`,
  `width` to the asset select — needed by the URL helpers below; the picker UI
  itself is not touched here, that is Task 18)
- Modify: `app/(dashboard)/builder/[id]/[step]/page.tsx` (its two `assetUrls`
  call sites — this file is a route composition root, not a feature module, so
  editing it does not cross the feature boundary)

No test file — this module wires together Tasks 3, 4, 5, 7, 8, each already
unit-tested on its own; this task is the DB-backed integration point, verified
via `pnpm db:local` in Task 19.

**Interfaces:**
- Consumes: everything produced by Tasks 2–8.
- Produces: `createAsset`, `replaceAsset`, `deleteAsset`, `getAsset`,
  `listAssets`, `searchAssets`, `getFolders`, `getQuota`, `updateAssetMeta`,
  `assetVariantUrl(asset, variant?)`, `thumbnailUrl(asset)`, `previewUrl(asset)`,
  `hasVariants` (re-exported) — every later task (route handlers, components,
  the media-library feature, the builder integration) imports only from here.

- [ ] **Step 1: Rewrite `services/media/index.ts`**

```typescript
import "server-only";

import { logger } from "@/lib/logger";
import { isDatabaseConfigured } from "@/lib/db";
import { extensionOf } from "@/services/upload";
import { BUCKETS } from "@/services/upload/storage";
import { processImage } from "./processing";
import { assetObjectPath, hasVariants } from "./paths";
import { writeAssetObjects, removeAssetObjects } from "./storage";
import {
  insertAsset,
  findAssetById,
  searchAssets as repoSearchAssets,
  listAllAssets,
  findUsagesForProfile,
  bumpVersionAndUpdate,
  updateAssetMeta as repoUpdateAssetMeta,
  deleteAssetRow,
  findBlockingUsages,
  getQuota as repoGetQuota,
} from "./repository";
import { computeByEvent, computeByType } from "./folders";
import { parseMediaCriteria } from "./criteria";
import type { MediaCriteria, RawSearchParams } from "./criteria";
import type { AssetRow, MediaVariant } from "./types";

/**
 * Media service — Ph4's Invitation Media Library (Ph4.md §15: "other modules
 * depend on the Media Library," never the reverse). Extends the seam Phase 3
 * introduced (see git history for services/media/index.ts's Phase 3 version)
 * with folders, search, image processing, versioned replace, and storage
 * quota, per docs/superpowers/specs/2026-07-18-phase4-media-library-design.md.
 */

export type { AssetRow, MediaVariant, AssetUsage } from "./types";
export type {
  MediaCriteria,
  RawSearchParams,
  MediaSort,
  MediaKindFilter,
} from "./criteria";
export {
  parseMediaCriteria,
  MEDIA_SORTS,
  MEDIA_KINDS,
  DEFAULT_MEDIA_SORT,
  DEFAULT_MEDIA_PAGE_SIZE,
} from "./criteria";
export type { ByEventView, ByTypeView, EventFolder } from "./folders";
export type { Quota, QuotaByEvent } from "./repository";
export { hasVariants, assetObjectPath } from "./paths";

/**
 * Proxy URL for one variant of one asset — never a Supabase signed URL
 * (design doc Decision 4: signed URLs rotate on every mint, which defeats
 * immutable caching for a grid of thumbnails).
 */
export function assetVariantUrl(
  asset: { id: string; version: number },
  variant: MediaVariant = "original",
): string {
  return `/api/media/${asset.id}/${asset.version}/${variant}`;
}

/** The right-sized URL for a grid thumbnail, falling back to the original when no variants exist. */
export function thumbnailUrl(asset: {
  id: string;
  version: number;
  width: number | null;
}): string {
  return assetVariantUrl(asset, hasVariants(asset) ? "thumbnail" : "original");
}

/** The right-sized URL for a detail view or builder preview, falling back to the original when no variants exist. */
export function previewUrl(asset: {
  id: string;
  version: number;
  width: number | null;
}): string {
  return assetVariantUrl(asset, hasVariants(asset) ? "preview" : "original");
}

function objectPathsFor(
  profileId: string,
  assetId: string,
  version: number,
  originalExtension: string,
  includeVariants: boolean,
): string[] {
  return [
    assetObjectPath(profileId, assetId, version, "original", originalExtension),
    ...(includeVariants
      ? [
          assetObjectPath(profileId, assetId, version, "thumbnail", originalExtension),
          assetObjectPath(profileId, assetId, version, "preview", originalExtension),
        ]
      : []),
  ];
}

export interface CreateAssetInput {
  profileId: string;
  file: File;
  altText?: string;
  tags?: string[];
}

export type CreateAssetResult =
  | { ok: true; assetId: string }
  | { ok: false; error: string };

/**
 * Store a file and record it as an asset — design doc's processing pipeline.
 * Runs `sharp` to generate thumbnail/preview variants; degrades to
 * original-only when the input can't be decoded (Decision 4). Path is derived
 * from the owner's id and a fresh random asset id, never from anything the
 * caller supplies — same reasoning as Phase 3's version of this function.
 */
export async function createAsset({
  profileId,
  file,
  altText,
  tags = [],
}: CreateAssetInput): Promise<CreateAssetResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Media is not available on this deployment." };
  }

  const assetId = crypto.randomUUID();
  const extension = extensionOf(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  const processed = await processImage(buffer);

  const writes = [
    {
      variant: "original" as const,
      path: assetObjectPath(profileId, assetId, 1, "original", extension),
      buffer,
      contentType: file.type,
    },
    ...(processed
      ? [
          {
            variant: "thumbnail" as const,
            path: assetObjectPath(profileId, assetId, 1, "thumbnail", extension),
            buffer: processed.thumbnail.buffer,
            contentType: processed.thumbnail.contentType,
          },
          {
            variant: "preview" as const,
            path: assetObjectPath(profileId, assetId, 1, "preview", extension),
            buffer: processed.preview.buffer,
            contentType: processed.preview.contentType,
          },
        ]
      : []),
  ];

  const written = await writeAssetObjects(writes);
  if (!written.ok) {
    await removeAssetObjects(written.written);
    return { ok: false, error: written.error };
  }

  try {
    const asset = await insertAsset({
      id: assetId,
      profileId,
      bucket: BUCKETS.media,
      storagePath: writes[0].path,
      kind: "IMAGE",
      mimeType: file.type,
      bytes: file.size,
      originalFilename: file.name.slice(0, 200),
      altText: altText?.trim() || null,
      tags,
      width: processed?.width ?? null,
      height: processed?.height ?? null,
    });

    return { ok: true, assetId: asset.id };
  } catch (error) {
    // The bytes landed but the record did not. Remove every object just
    // written rather than leave storage holding an orphan nothing points at.
    logger.report(error, { at: "createAsset", profileId });
    await removeAssetObjects(writes.map((w) => w.path));
    return {
      ok: false,
      error: "Could not save that image. Please try again.",
    };
  }
}

export type ReplaceAssetResult = { ok: true } | { ok: false; error: string };

/**
 * Replace an asset in place — design doc Decision 2. Same id, new bytes,
 * version incremented. The new version's objects are written and the row is
 * confirmed updated *before* the previous version's objects are removed —
 * never the reverse, per the design doc's error-handling cross-reference.
 */
export async function replaceAsset(
  profileId: string,
  assetId: string,
  file: File,
): Promise<ReplaceAssetResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Media is not available on this deployment." };
  }

  const existing = await findAssetById(profileId, assetId);
  if (!existing) return { ok: false, error: "That image no longer exists." };

  const nextVersion = existing.version + 1;
  const extension = extensionOf(file.name);
  const buffer = Buffer.from(await file.arrayBuffer());
  const processed = await processImage(buffer);

  const writes = [
    {
      variant: "original" as const,
      path: assetObjectPath(profileId, assetId, nextVersion, "original", extension),
      buffer,
      contentType: file.type,
    },
    ...(processed
      ? [
          {
            variant: "thumbnail" as const,
            path: assetObjectPath(profileId, assetId, nextVersion, "thumbnail", extension),
            buffer: processed.thumbnail.buffer,
            contentType: processed.thumbnail.contentType,
          },
          {
            variant: "preview" as const,
            path: assetObjectPath(profileId, assetId, nextVersion, "preview", extension),
            buffer: processed.preview.buffer,
            contentType: processed.preview.contentType,
          },
        ]
      : []),
  ];

  const written = await writeAssetObjects(writes);
  if (!written.ok) {
    await removeAssetObjects(written.written);
    return { ok: false, error: written.error };
  }

  try {
    await bumpVersionAndUpdate(assetId, {
      bucket: BUCKETS.media,
      storagePath: writes[0].path,
      mimeType: file.type,
      bytes: file.size,
      originalFilename: file.name.slice(0, 200),
      width: processed?.width ?? null,
      height: processed?.height ?? null,
    });
  } catch (error) {
    logger.report(error, { at: "replaceAsset", profileId, assetId });
    await removeAssetObjects(writes.map((w) => w.path));
    return {
      ok: false,
      error: "Could not replace that image. Please try again.",
    };
  }

  // Only now — new objects written, row confirmed updated — remove the
  // previous version's objects.
  const previousPaths = objectPathsFor(
    profileId,
    assetId,
    existing.version,
    extensionOf(existing.originalFilename),
    hasVariants(existing),
  );
  await removeAssetObjects(previousPaths);

  return { ok: true };
}

export type DeleteAssetResult =
  | { ok: true }
  | { ok: false; error: string; usedBy?: string[] };

/**
 * Delete an asset — Ph4.md §11 (Delete Protection). Extends Phase 3's version
 * of this function to remove up to three storage objects instead of one.
 */
export async function deleteAsset(
  profileId: string,
  assetId: string,
): Promise<DeleteAssetResult> {
  if (!isDatabaseConfigured())
    return { ok: false, error: "Media is not available." };

  const asset = await findAssetById(profileId, assetId);
  if (!asset) return { ok: false, error: "That image no longer exists." };

  const usedBy = await findBlockingUsages(assetId);
  if (usedBy.length > 0) {
    return {
      ok: false,
      error: "That image is still used by an invitation.",
      usedBy,
    };
  }

  try {
    await deleteAssetRow(asset.id);
  } catch (error) {
    logger.report(error, { at: "deleteAsset", profileId, assetId });
    return {
      ok: false,
      error: "Could not delete that image. Please try again.",
    };
  }

  // Row deleted last-but-storage-removed-last-of-all would leave a dangling
  // row if storage cleanup crashed; row-then-storage means the worst case is
  // an orphaned file, which costs kilobytes and is invisible to any user.
  const paths = objectPathsFor(
    profileId,
    assetId,
    asset.version,
    extensionOf(asset.originalFilename),
    hasVariants(asset),
  );
  await removeAssetObjects(paths);

  return { ok: true };
}

export async function getAsset(
  profileId: string,
  assetId: string,
): Promise<AssetRow | null> {
  return findAssetById(profileId, assetId);
}

/** A customer's assets, newest first, unpaginated — used by the builder's media step and by folder computation, which both need the whole pool. */
export async function listAssets(profileId: string): Promise<AssetRow[]> {
  return listAllAssets(profileId);
}

export interface SearchAssetsResult {
  assets: AssetRow[];
  totalCount: number;
  criteria: MediaCriteria;
}

/** Ph4.md §8 — filename, tags, media type, upload date, and event, via services/media/criteria.ts + query.ts. */
export async function searchAssets(
  profileId: string,
  rawParams: RawSearchParams,
): Promise<SearchAssetsResult> {
  const criteria = parseMediaCriteria(rawParams);
  const { assets, totalCount } = await repoSearchAssets(profileId, criteria);
  return { assets, totalCount, criteria };
}

export interface FoldersResult {
  byEvent: ReturnType<typeof computeByEvent>;
  byType: ReturnType<typeof computeByType>;
}

/** Design doc Decision 1 — computed at read time from the current asset pool and usage join, never stored. */
export async function getFolders(profileId: string): Promise<FoldersResult> {
  const [assets, usages] = await Promise.all([
    listAllAssets(profileId),
    findUsagesForProfile(profileId),
  ]);

  return {
    byEvent: computeByEvent(
      assets.map((asset) => asset.id),
      usages,
    ),
    byType: computeByType(
      assets.map((asset) => ({ id: asset.id, tags: asset.tags })),
    ),
  };
}

export async function getQuota(profileId: string) {
  return repoGetQuota(profileId);
}

export async function updateAssetMeta(
  profileId: string,
  assetId: string,
  data: { altText?: string | null; tags?: string[] },
): Promise<AssetRow | null> {
  return repoUpdateAssetMeta(profileId, assetId, data);
}
```

- [ ] **Step 2: Add `version` and `width` to the builder's asset select**

In `features/invitation-builder/repository.ts`, change the `media.include.asset.select`
block (around line 38) from:

```typescript
      asset: {
        select: {
          id: true,
          bucket: true,
          storagePath: true,
          altText: true,
          originalFilename: true,
        },
      },
```

to:

```typescript
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
```

- [ ] **Step 3: Update the builder step page's two `assetUrls` call sites**

In `app/(dashboard)/builder/[id]/[step]/page.tsx`, change the import (line 20)
from:

```typescript
import { listAssets, assetUrls } from "@/services/media";
```

to:

```typescript
import { listAssets, thumbnailUrl, previewUrl } from "@/services/media";
```

Then change the `"media"` case from:

```typescript
      case "media": {
        const assets = await listAssets(profile!.id);
        // Signed URLs, resolved server-side. The client never sees a storage path.
        const urls = await assetUrls(assets);

        return (
          <MediaStep
            invitationId={draft!.id}
            assets={assets.map((asset) => ({
              id: asset.id,
              url: urls.get(asset.id) ?? null,
              altText: asset.altText,
              originalFilename: asset.originalFilename,
            }))}
```

to:

```typescript
      case "media": {
        const assets = await listAssets(profile!.id);
        // Proxy URLs, built from id+version — no signed URL ever reaches the
        // client (design doc Decision 4).

        return (
          <MediaStep
            invitationId={draft!.id}
            assets={assets.map((asset) => ({
              id: asset.id,
              url: thumbnailUrl(asset),
              altText: asset.altText,
              originalFilename: asset.originalFilename,
            }))}
```

And change the `"preview"` case from:

```typescript
      case "preview": {
        const urls = await assetUrls(draft!.media.map((link) => link.asset));

        // Group resolved URLs by slot for the view model.
        const mediaUrls: Partial<
          Record<"COVER" | "COUPLE" | "FAMILY" | "LOGO", string[]>
        > = {};
        for (const link of draft!.media) {
          if (link.slot === "MUSIC") continue;
          const url = urls.get(link.assetId);
          if (!url) continue;

          const slot = link.slot as "COVER" | "COUPLE" | "FAMILY" | "LOGO";
          (mediaUrls[slot] ??= []).push(url);
        }
```

to:

```typescript
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
```

- [ ] **Step 4: Type-check and run the full unit suite**

```bash
pnpm typecheck && pnpm test
```

Expected: both exit 0. Every test from Tasks 2–6 still passes; no test exercises
`index.ts` itself (DB-backed, verified in Task 19).

- [ ] **Step 5: Commit**

```bash
git add services/media/index.ts features/invitation-builder/repository.ts "app/(dashboard)/builder/[id]/[step]/page.tsx"
git commit -m "feat(media): rewrite services/media barrel with processing, folders, search, quota"
```

---

### Task 10: `app/api/media/[assetId]/[version]/[variant]/route.ts` — serving proxy

**Files:**
- Create: `app/api/media/[assetId]/[version]/[variant]/route.ts`

No test file — this route needs a signed-in session and a real stored asset to
exercise meaningfully; it is verified manually against `pnpm db:local` in
Task 19, the same convention as `app/api/placeholder/[surface]/[seed]/route.ts`
(also untested, also a pure function of its URL, but that one needs no auth or
storage round trip).

**Interfaces:**
- Consumes: `getAsset`, `hasVariants`, `assetObjectPath` from `services/media`
  (Task 9); `signedUrl` from `services/upload/storage.ts` (existing);
  `extensionOf` from `services/upload` (existing); `getProfile` from
  `lib/auth/session.ts` (existing).

- [ ] **Step 1: Write the route**

```typescript
import { type NextRequest } from "next/server";
import { getProfile } from "@/lib/auth/session";
import { getAsset, hasVariants, assetObjectPath } from "@/services/media";
import { extensionOf } from "@/services/upload";
import { signedUrl } from "@/services/upload/storage";

/**
 * Authenticated media serving — design doc Decision 4. Mirrors
 * app/api/placeholder/[surface]/[seed]/route.ts's shape, but every response
 * here requires a session and an ownership check, because unlike placeholder
 * art this serves a customer's own private photos.
 *
 * Never Edge: this calls services/upload/storage.ts, which reaches Supabase
 * via lib/supabase/server.ts's cookie-based client — a Node API.
 */
export const runtime = "nodejs";

type Variant = "original" | "thumbnail" | "preview";
const VALID_VARIANTS: readonly Variant[] = ["original", "thumbnail", "preview"];

export async function GET(
  _request: NextRequest,
  {
    params,
  }: { params: { assetId: string; version: string; variant: string } },
) {
  if (!(VALID_VARIANTS as readonly string[]).includes(params.variant)) {
    return new Response("Unknown variant", { status: 404 });
  }
  const variant = params.variant as Variant;

  const profile = await getProfile();
  if (!profile) return new Response("Unauthorized", { status: 401 });

  // Scoped to the caller: this is what stops one customer requesting another's
  // photo by guessing an id, same reasoning as deleteAsset's ownership check.
  const asset = await getAsset(profile.id, params.assetId);
  if (!asset) return new Response("Not found", { status: 404 });

  const requestedVersion = Number.parseInt(params.version, 10);
  if (requestedVersion !== asset.version) {
    // A stale or bookmarked URL from a replaced version — those objects were
    // deleted once the replacement was confirmed written (design doc's
    // replace-ordering guarantee). Every current page constructs this URL
    // from the row's current version, so this path is never hit by normal
    // navigation.
    return new Response("Not found", { status: 404 });
  }

  if (variant !== "original" && !hasVariants(asset)) {
    // The design's fallback rule is the caller's job (see thumbnailUrl /
    // previewUrl in services/media/index.ts) — a request that skips that and
    // asks for a variant that was never generated gets a plain 404, not a
    // silent substitution.
    return new Response("Not found", { status: 404 });
  }

  const path = assetObjectPath(
    asset.profileId,
    asset.id,
    asset.version,
    variant,
    extensionOf(asset.originalFilename),
  );

  // Short-lived on purpose: this URL is used once, immediately, server-side,
  // and never reaches the browser — only our own re-served bytes do.
  const url = await signedUrl(asset.bucket as "media" | "avatars", path, 60);
  if (!url) return new Response("Not found", { status: 404 });

  const upstream = await fetch(url);
  if (!upstream.ok || !upstream.body) {
    return new Response("Not found", { status: 404 });
  }

  const contentType = variant === "original" ? asset.mimeType : "image/webp";

  return new Response(upstream.body, {
    headers: {
      "Content-Type": contentType,
      // Version is embedded in the URL path, so this specific triple's bytes
      // never change — safe to cache forever, per-user (`private`, since this
      // is not public content like the placeholder-art route).
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add "app/api/media/[assetId]/[version]/[variant]/route.ts"
git commit -m "feat(media): add authenticated serving proxy for asset variants"
```

---

### Task 11: `app/api/media/upload/route.ts` — upload route handler

**Files:**
- Create: `app/api/media/upload/route.ts`

No test file — needs a signed-in session; verified manually in Task 19. This is
the deliberate, scoped exception to the Server Action pattern (design doc
Decision 3's implementation note): a Route Handler is required so the client
can drive it with `XMLHttpRequest` and get real upload-progress events, which
Server Actions cannot expose.

**Interfaces:**
- Consumes: `createAsset`, `replaceAsset` from `services/media` (Task 9);
  `validateUpload` from `services/upload` (existing); `getProfile` from
  `lib/auth/session.ts` (existing).
- Produces: `POST /api/media/upload`, one file per request, JSON
  `{ ok: true, assetId } | { ok: false, error }` — Task 12's
  `use-upload-queue.ts` is the only caller.

- [ ] **Step 1: Write the route**

An optional `assetId` field switches this from create to replace — this is
what lets Task 14's detail-panel Replace control literally reuse this same
route and the same `use-upload-queue` hook, per design doc's UI section
("Replace reuses the same dropzone, scoped to one file, from the detail
panel").

```typescript
import { NextResponse, type NextRequest } from "next/server";
import { getProfile } from "@/lib/auth/session";
import { createAsset, replaceAsset } from "@/services/media";
import { validateUpload } from "@/services/upload";

/**
 * Upload endpoint — design doc Decision 3's implementation note. One file per
 * request: the Upload Manager's per-file progress bar (Ph4.md §3) needs one
 * XHR per file to report progress meaningfully: a single request carrying five
 * files would show one progress bar for all of them, which answers the wrong
 * question ("how much of the batch" instead of "how much of THIS file").
 *
 * Never Edge: createAsset/replaceAsset call sharp, a native binary.
 */
export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const profile = await getProfile();
  if (!profile) {
    return NextResponse.json(
      { ok: false, error: "Please sign in again." },
      { status: 401 },
    );
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json(
      { ok: false, error: "Choose a file first." },
      { status: 400 },
    );
  }

  // Checked here as well as inside createAsset/replaceAsset, same reasoning as
  // features/invitation-builder/media-actions.ts: this is the layer that can
  // say it next to the request, before any processing runs.
  const failure = validateUpload(
    { name: file.name, size: file.size, type: file.type },
    "image",
  );
  if (failure) {
    return NextResponse.json(
      { ok: false, error: failure.message },
      { status: 400 },
    );
  }

  const assetId = formData.get("assetId")?.toString();

  if (assetId) {
    const result = await replaceAsset(profile.id, assetId, file);
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 422 });
    }
    return NextResponse.json({ ok: true, assetId });
  }

  const altText = formData.get("altText")?.toString();
  const tagsRaw = formData.get("tags")?.toString();
  const tags = tagsRaw
    ? tagsRaw
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean)
    : [];

  const result = await createAsset({ profileId: profile.id, file, altText, tags });
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 422 });
  }

  return NextResponse.json({ ok: true, assetId: result.assetId });
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add app/api/media/upload/route.ts
git commit -m "feat(media): add upload route handler for XHR progress"
```

---

### Task 12: `lib/hooks/use-upload-queue.ts` — shared upload queue

**Files:**
- Create: `lib/hooks/use-upload-queue.ts`

No test file — this codebase has no React hook tests anywhere (`vitest.config.ts`
runs in a `node` environment, and even `features/invitation-builder/components/
use-autosave.ts`, an existing hook of comparable complexity, has none). Verified
manually in a signed-in browser session, per Task 19 and this codebase's
established "Known limitation" note for interactive features (Phase 3's builder
UI carries the same caveat).

Shared in `lib/hooks/` rather than owned by one feature — both
`features/media-library` (Task 16) and `features/invitation-builder` (Task 18)
need it, and cross-feature imports are forbidden. Same placement reasoning as
the existing `lib/hooks/use-toast.ts`.

**Interfaces:**
- Consumes: `POST /api/media/upload` (Task 11).
- Produces: `useUploadQueue(onUploaded?)` returning `{ items, enqueue, retry,
  cancel, remove }`, `EnqueueOptions` (including the replace-mode `assetId`),
  and the `UploadItem` type — Task 13's `upload-dropzone.tsx` (create mode) and
  Task 14's `asset-detail-sheet.tsx` (replace mode) both consume this.

- [ ] **Step 1: Write `lib/hooks/use-upload-queue.ts`**

```typescript
"use client";

import * as React from "react";

/**
 * Shared multi-file upload queue — design doc Decision 3's implementation
 * note. Server Actions expose no upload-progress event, so this hook posts to
 * app/api/media/upload/route.ts via `XMLHttpRequest` (not `fetch`, which has no
 * upload-progress event) to get real byte-level progress, with per-file
 * retry and cancel (Ph4.md §3).
 */

export type UploadItemStatus = "queued" | "uploading" | "done" | "error";

export interface UploadItem {
  id: string;
  file: File;
  status: UploadItemStatus;
  progress: number;
  error?: string;
  assetId?: string;
}

export interface EnqueueOptions {
  altText?: string;
  tags?: string[];
  /** Present for a Replace upload (Task 14) — switches the route from create to replace. */
  assetId?: string;
}

interface QueuedFile {
  file: File;
  altText?: string;
  tags?: string[];
  assetId?: string;
}

export function useUploadQueue(onUploaded?: (assetId: string) => void) {
  const [items, setItems] = React.useState<UploadItem[]>([]);
  const xhrs = React.useRef(new Map<string, XMLHttpRequest>());
  const files = React.useRef(new Map<string, QueuedFile>());

  const update = React.useCallback((id: string, patch: Partial<UploadItem>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }, []);

  const upload = React.useCallback(
    (id: string) => {
      const queued = files.current.get(id);
      if (!queued) return;

      const xhr = new XMLHttpRequest();
      xhrs.current.set(id, xhr);
      xhr.open("POST", "/api/media/upload");

      xhr.upload.addEventListener("progress", (event) => {
        if (!event.lengthComputable) return;
        update(id, { progress: Math.round((event.loaded / event.total) * 100) });
      });

      xhr.addEventListener("load", () => {
        xhrs.current.delete(id);
        let payload: { ok: boolean; assetId?: string; error?: string } | null =
          null;
        try {
          payload = JSON.parse(xhr.responseText);
        } catch {
          payload = null;
        }

        if (xhr.status >= 200 && xhr.status < 300 && payload?.ok && payload.assetId) {
          update(id, { status: "done", progress: 100, assetId: payload.assetId });
          onUploaded?.(payload.assetId);
        } else {
          update(id, {
            status: "error",
            error: payload?.error ?? "Upload failed.",
          });
        }
      });

      xhr.addEventListener("error", () => {
        xhrs.current.delete(id);
        update(id, { status: "error", error: "Upload failed. Check your connection." });
      });

      xhr.addEventListener("abort", () => {
        xhrs.current.delete(id);
        update(id, { status: "error", error: "Cancelled." });
      });

      const formData = new FormData();
      formData.set("file", queued.file);
      if (queued.assetId) formData.set("assetId", queued.assetId);
      if (queued.altText) formData.set("altText", queued.altText);
      if (queued.tags?.length) formData.set("tags", queued.tags.join(","));

      update(id, { status: "uploading", progress: 0, error: undefined });
      xhr.send(formData);
    },
    [update, onUploaded],
  );

  const enqueue = React.useCallback(
    (fileList: File[], options: EnqueueOptions = {}) => {
      const newItems: UploadItem[] = fileList.map((file) => {
        const id = crypto.randomUUID();
        files.current.set(id, {
          file,
          altText: options.altText,
          tags: options.tags,
          assetId: options.assetId,
        });
        return { id, file, status: "queued", progress: 0 };
      });

      setItems((current) => [...current, ...newItems]);
      for (const item of newItems) upload(item.id);
    },
    [upload],
  );

  const retry = React.useCallback(
    (id: string) => {
      update(id, { error: undefined });
      upload(id);
    },
    [update, upload],
  );

  const cancel = React.useCallback((id: string) => {
    xhrs.current.get(id)?.abort();
  }, []);

  const remove = React.useCallback((id: string) => {
    xhrs.current.get(id)?.abort();
    xhrs.current.delete(id);
    files.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  return { items, enqueue, retry, cancel, remove };
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/use-upload-queue.ts
git commit -m "feat(media): add shared XHR-based upload queue hook"
```

---

### Task 13: `components/media/` — asset card, grid, and upload dropzone

**Files:**
- Create: `components/media/asset-card.tsx`
- Create: `components/media/asset-grid.tsx`
- Create: `components/media/upload-dropzone.tsx`

No test file — these are presentational Client Components; this codebase does
not unit-test components (`features/invitation-builder/components/steps/
media-step.tsx`, the closest precedent, has none either). Verified manually in
a signed-in browser session (Task 19).

**Interfaces:**
- Consumes: `useUploadQueue`, `UploadItem` (Task 12); `EmptyState` (existing,
  `components/ui/empty-state.tsx`); `UPLOAD_CONSTRAINTS`, `acceptAttribute`,
  `validateUpload` from `services/upload` (existing, client-safe — no
  `server-only` import).
- Produces: `MediaAssetSummary` (the plain, pre-resolved shape every Client
  Component in this feature renders from — **never** `AssetRow` from
  `services/media` directly: that barrel starts with `import "server-only"`,
  so importing it, even for a type, from a Client Component is exactly the
  mistake that import exists to catch. The server component that fetches
  assets calls `thumbnailUrl(asset)` itself and maps to this shape before
  handing data to any of these three components — same pattern Phase 3's
  `media-step.tsx` already established with its own local `AssetSummary`).
  `AssetCard`, `AssetGrid`, `UploadDropzone` — Tasks 14, 16, and 18 all import
  these.

- [ ] **Step 1: Write `components/media/asset-card.tsx`**

```typescript
"use client";

import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface MediaAssetSummary {
  id: string;
  thumbnailUrl: string;
  altText: string | null;
  originalFilename: string;
  tags: string[];
}

export function AssetCard({
  asset,
  selected,
  onSelect,
  onRemove,
}: {
  asset: MediaAssetSummary;
  selected?: boolean;
  onSelect?: (asset: MediaAssetSummary) => void;
  /**
   * Optional quick-delete affordance — a small hover trash icon, sibling to
   * the select button rather than nested inside it (nesting two interactive
   * elements in one <button> is invalid). Task 17's builder picker uses this;
   * the library's own grid (Task 16) omits it, since delete there goes
   * through the full detail panel instead.
   */
  onRemove?: (asset: MediaAssetSummary) => void;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        onClick={() => onSelect?.(asset)}
        aria-pressed={onSelect ? Boolean(selected) : undefined}
        className={cn(
          "relative block w-full overflow-hidden rounded-lg border-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          selected
            ? "border-foreground"
            : "border-transparent hover:border-border",
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={asset.thumbnailUrl}
          alt={asset.altText ?? asset.originalFilename}
          className="aspect-square w-full bg-muted object-cover"
          loading="lazy"
        />
        <p className="truncate px-1 py-1 text-xs text-muted-foreground">
          {asset.originalFilename}
        </p>
      </button>

      {onRemove ? (
        <button
          type="button"
          onClick={() => onRemove(asset)}
          aria-label={`Delete ${asset.originalFilename}`}
          className="absolute right-1.5 top-1.5 flex size-7 items-center justify-center rounded-full bg-background/80 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100"
        >
          <Trash2 className="size-3.5 text-destructive" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 2: Write `components/media/asset-grid.tsx`**

```typescript
"use client";

import { Images } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { AssetCard, type MediaAssetSummary } from "./asset-card";

export function AssetGrid({
  assets,
  selectedIds,
  onSelect,
  onRemove,
  emptyTitle = "No photos yet",
  emptyDescription = "Upload one to get started.",
}: {
  assets: MediaAssetSummary[];
  selectedIds?: string[];
  onSelect?: (asset: MediaAssetSummary) => void;
  onRemove?: (asset: MediaAssetSummary) => void;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  if (assets.length === 0) {
    return (
      <EmptyState
        icon={<Images />}
        title={emptyTitle}
        description={emptyDescription}
      />
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
      {assets.map((asset) => (
        <AssetCard
          key={asset.id}
          asset={asset}
          selected={selectedIds?.includes(asset.id)}
          onSelect={onSelect}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Write `components/media/upload-dropzone.tsx`**

```typescript
"use client";

import * as React from "react";
import {
  Upload,
  X,
  RotateCcw,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";
import { cn, formatBytes } from "@/lib/utils";
import {
  UPLOAD_CONSTRAINTS,
  acceptAttribute,
  validateUpload,
} from "@/services/upload";
import { useUploadQueue, type UploadItem } from "@/lib/hooks/use-upload-queue";

/**
 * Multi-file drag-and-drop upload with a per-file queue — Ph4.md §3. Also
 * doubles as the Replace control (design doc's UI section): pass `assetId` to
 * restrict to one file and route through replaceAsset instead of createAsset.
 */
export function UploadDropzone({
  onUploaded,
  assetId,
  className,
}: {
  onUploaded?: (assetId: string) => void;
  assetId?: string;
  className?: string;
}) {
  const { items, enqueue, retry, cancel, remove } = useUploadQueue(onUploaded);
  const [dragging, setDragging] = React.useState(false);
  const { maxBytes, extensions } = UPLOAD_CONSTRAINTS.image;
  const multiple = !assetId;

  function acceptFiles(fileList: FileList | null) {
    if (!fileList) return;

    const valid: File[] = [];
    for (const file of Array.from(fileList)) {
      // Client-side courtesy only, same gate/courtesy split documented in
      // services/upload/validation.ts — the upload route validates again.
      const failure = validateUpload(
        { name: file.name, size: file.size, type: file.type },
        "image",
      );
      if (!failure) valid.push(file);
    }

    const selected = multiple ? valid : valid.slice(0, 1);
    if (selected.length > 0) enqueue(selected, { assetId });
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    acceptFiles(event.dataTransfer.files);
  }

  return (
    <div className={className}>
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-8 text-center transition-colors",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background",
          dragging
            ? "border-primary bg-muted"
            : "border-border hover:bg-muted/50",
        )}
      >
        <input
          type="file"
          multiple={multiple}
          accept={acceptAttribute("image")}
          onChange={(event) => {
            acceptFiles(event.target.files);
            event.target.value = "";
          }}
          className="sr-only"
        />
        <Upload className="size-5 text-muted-foreground" aria-hidden="true" />
        <span className="text-sm font-medium">
          {assetId
            ? "Drop a replacement photo, or click to choose"
            : "Drop photos here, or click to choose"}
        </span>
        <span className="text-xs text-muted-foreground">
          {extensions.join(", ")} — up to {formatBytes(maxBytes)} each
        </span>
      </label>

      {items.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <UploadQueueRow
              key={item.id}
              item={item}
              onRetry={() => retry(item.id)}
              onCancel={() => cancel(item.id)}
              onDismiss={() => remove(item.id)}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function UploadQueueRow({
  item,
  onRetry,
  onCancel,
  onDismiss,
}: {
  item: UploadItem;
  onRetry: () => void;
  onCancel: () => void;
  onDismiss: () => void;
}) {
  return (
    <li className="flex items-center gap-3 rounded-md border border-border px-3 py-2 text-sm">
      <span className="flex-1 truncate">{item.file.name}</span>

      {item.status === "queued" ? (
        <Loader2
          className="size-4 animate-spin text-muted-foreground"
          aria-hidden="true"
        />
      ) : null}

      {item.status === "uploading" ? (
        <>
          <div className="h-1.5 w-24 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${item.progress}%` }}
            />
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label={`Cancel ${item.file.name}`}
          >
            <X className="size-4 text-muted-foreground" />
          </button>
        </>
      ) : null}

      {item.status === "done" ? (
        <Check className="size-4 text-emerald-600" aria-hidden="true" />
      ) : null}

      {item.status === "error" ? (
        <span className="flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="size-3.5" aria-hidden="true" />
          {item.error}
        </span>
      ) : null}

      {item.status === "error" ? (
        <button
          type="button"
          onClick={onRetry}
          aria-label={`Retry ${item.file.name}`}
        >
          <RotateCcw className="size-4 text-muted-foreground" />
        </button>
      ) : null}

      {item.status === "done" || item.status === "error" ? (
        <button
          type="button"
          onClick={onDismiss}
          aria-label={`Remove ${item.file.name} from the queue`}
        >
          <X className="size-4 text-muted-foreground" />
        </button>
      ) : null}
    </li>
  );
}
```

- [ ] **Step 4: Type-check**

```bash
pnpm typecheck
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add components/media/asset-card.tsx components/media/asset-grid.tsx components/media/upload-dropzone.tsx
git commit -m "feat(media): add shared asset grid and upload dropzone components"
```

---

### Task 14: `components/media/asset-detail-sheet.tsx` — detail panel

**Files:**
- Create: `components/media/asset-detail-sheet.tsx`

No test file — Client Component, same reasoning as Task 13. Verified manually
in Task 19.

**Interfaces:**
- Consumes: `UploadDropzone` (Task 13); `MediaAssetSummary` (Task 13);
  `Sheet`/`SheetContent`/`SheetTitle`/`SheetDescription` (existing,
  `components/ui/sheet.tsx`); `Button`, `Input` (existing); `notify` (existing,
  `lib/hooks/use-toast.ts`).
- Produces: `MediaAssetDetail`, `AssetUsageSummary`, `MetaFormState`,
  `DeleteFormState`, `AssetDetailSheet` — Task 16's `browser.tsx` is the
  consumer, wiring `updateMetaAction`/`deleteAction` to Task 15's Server
  Actions.

- [ ] **Step 1: Write `components/media/asset-detail-sheet.tsx`**

```typescript
"use client";

import * as React from "react";
import { useFormState } from "react-dom";
import { Trash2 } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { notify } from "@/lib/hooks/use-toast";
import { formatBytes } from "@/lib/utils";
import { UploadDropzone } from "./upload-dropzone";
import type { MediaAssetSummary } from "./asset-card";

/**
 * Asset detail panel — design doc's UI section. Metadata edits and delete are
 * plain Server Actions bound via useFormState (the pattern every form in this
 * codebase already uses); Replace is the one exception, reusing
 * UploadDropzone in its single-file/assetId mode for real progress.
 */

export interface MediaAssetDetail extends MediaAssetSummary {
  previewUrl: string;
  bytes: number;
  width: number | null;
  height: number | null;
  uploadedAt: string;
}

export interface AssetUsageSummary {
  invitationId: string;
  invitationTitle: string;
  slot: string;
}

export interface MetaFormState {
  error?: string;
}

export interface DeleteFormState {
  error?: string;
  usedBy?: string[];
}

export function AssetDetailSheet({
  asset,
  usages,
  open,
  onOpenChange,
  onReplaced,
  updateMetaAction,
  deleteAction,
}: {
  asset: MediaAssetDetail | null;
  usages: AssetUsageSummary[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onReplaced?: () => void;
  updateMetaAction: (
    prev: MetaFormState,
    formData: FormData,
  ) => Promise<MetaFormState>;
  deleteAction: (
    prev: DeleteFormState,
    formData: FormData,
  ) => Promise<DeleteFormState>;
}) {
  const [metaState, metaAction] = useFormState(updateMetaAction, {});
  const [deleteState, runDelete] = useFormState(deleteAction, {});

  React.useEffect(() => {
    if (metaState.error) {
      notify.error({
        title: "Could not save changes",
        description: metaState.error,
      });
    }
  }, [metaState.error]);

  React.useEffect(() => {
    if (deleteState.error) {
      // Ph4.md §11 — name what is using it rather than just refusing, same
      // pattern as features/invitation-builder/components/steps/media-step.tsx.
      notify.error({
        title: "Cannot delete that image",
        description: deleteState.usedBy?.length
          ? `${deleteState.error} Used by: ${deleteState.usedBy.join(", ")}.`
          : deleteState.error,
      });
    }
  }, [deleteState.error, deleteState.usedBy]);

  if (!asset) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-md overflow-y-auto sm:w-96"
      >
        <SheetTitle>{asset.originalFilename}</SheetTitle>
        <SheetDescription>
          {formatBytes(asset.bytes)}
          {asset.width && asset.height
            ? ` · ${asset.width}×${asset.height}`
            : ""}
          {` · Uploaded ${asset.uploadedAt}`}
        </SheetDescription>

        <div className="mt-4 space-y-6 px-1">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={asset.previewUrl}
            alt={asset.altText ?? asset.originalFilename}
            className="w-full rounded-lg border border-border object-contain"
          />

          <form action={metaAction} className="space-y-3">
            <input type="hidden" name="assetId" value={asset.id} />
            <div>
              <label htmlFor="altText" className="text-xs font-medium">
                Alt text
              </label>
              <Input
                id="altText"
                name="altText"
                defaultValue={asset.altText ?? ""}
                placeholder="Describe this photo"
              />
            </div>
            <div>
              <label htmlFor="tags" className="text-xs font-medium">
                Tags
              </label>
              <Input
                id="tags"
                name="tags"
                defaultValue={asset.tags.join(", ")}
                placeholder="logo, corporate, background"
              />
            </div>
            <Button type="submit" variant="outline" size="sm">
              Save
            </Button>
          </form>

          <div>
            <h4 className="text-xs font-medium">Replace photo</h4>
            <p className="mb-2 text-xs text-muted-foreground">
              Every page using this photo updates automatically.
            </p>
            <UploadDropzone assetId={asset.id} onUploaded={onReplaced} />
          </div>

          <div>
            <h4 className="text-xs font-medium">Used in</h4>
            {usages.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Not used by any invitation.
              </p>
            ) : (
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {usages.map((usage) => (
                  <li key={`${usage.invitationId}-${usage.slot}`}>
                    {usage.invitationTitle} — {usage.slot.toLowerCase()}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <form action={runDelete}>
            <input type="hidden" name="assetId" value={asset.id} />
            <Button type="submit" variant="destructive" size="sm">
              <Trash2 aria-hidden="true" />
              Delete
            </Button>
          </form>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add components/media/asset-detail-sheet.tsx
git commit -m "feat(media): add asset detail panel with replace and delete"
```

---

### Task 15: `features/media-library/actions.ts` — metadata and delete Server Actions

**Files:**
- Create: `features/media-library/actions.ts`

No test file — thin Server Action wrappers, same convention as
`features/invitation-builder/media-actions.ts` (also untested, verified via
`pnpm db:local` + browser).

**Interfaces:**
- Consumes: `updateAssetMeta`, `deleteAsset` from `services/media` (Task 9);
  `getProfile` from `lib/auth/session.ts` (existing).
- Produces: `updateAssetMetaAction`, `deleteAssetAction`. Their own
  `MetaFormState`/`DeleteFormState` types are **structurally**, not
  nominally, compatible with the ones `components/media/asset-detail-sheet.tsx`
  declares (Task 14) — deliberately not imported from there. `components/media`
  is shared by two features (media-library and, from Task 17,
  invitation-builder); it must depend on neither, so the shared component
  declares its own minimal shape and any feature's action satisfying that
  shape works, with no import edge from a shared component to a specific
  feature.

- [ ] **Step 1: Write `features/media-library/actions.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth/session";
import { updateAssetMeta, deleteAsset } from "@/services/media";
import { routes } from "@/lib/config";

/**
 * Asset metadata and delete — Ph4.md §6 (metadata), §11 (delete protection).
 * Thin: the work is in services/media; this exists only to turn a form post
 * into that call, same shape as
 * features/invitation-builder/media-actions.ts.
 */

export interface MetaFormState {
  error?: string;
}

export async function updateAssetMetaAction(
  _prev: MetaFormState,
  formData: FormData,
): Promise<MetaFormState> {
  const profile = await getProfile();
  if (!profile) return { error: "Please sign in again." };

  const assetId = String(formData.get("assetId") ?? "");
  const altText = formData.get("altText")?.toString().trim();
  const tagsRaw = formData.get("tags")?.toString() ?? "";
  const tags = tagsRaw
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);

  const result = await updateAssetMeta(profile.id, assetId, {
    altText: altText || null,
    tags,
  });
  if (!result) return { error: "That image no longer exists." };

  revalidatePath(routes.dashboard.media);
  return {};
}

export interface DeleteFormState {
  error?: string;
  usedBy?: string[];
}

export async function deleteAssetAction(
  _prev: DeleteFormState,
  formData: FormData,
): Promise<DeleteFormState> {
  const profile = await getProfile();
  if (!profile) return { error: "Please sign in again." };

  const assetId = String(formData.get("assetId") ?? "");
  const result = await deleteAsset(profile.id, assetId);
  if (!result.ok) return { error: result.error, usedBy: result.usedBy };

  revalidatePath(routes.dashboard.media);
  return {};
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add features/media-library/actions.ts
git commit -m "feat(media-library): add metadata and delete Server Actions"
```

---

### Task 16: `features/media-library/browser.tsx` + dashboard page wiring

**Files:**
- Create: `features/media-library/browser.tsx`
- Modify: `app/(dashboard)/dashboard/media/page.tsx` (full rewrite — currently
  the Phase 1 placeholder read earlier in this plan's research)

No test file — Client Component composition + a data-fetching Server
Component page, same convention as every other dashboard page in this
codebase. Verified manually in Task 19.

**Interfaces:**
- Consumes: `AssetGrid`, `UploadDropzone`, `AssetDetailSheet` and its types
  (Tasks 13–14); `updateAssetMetaAction`, `deleteAssetAction` (Task 15);
  `listAssets`, `searchAssets`, `getFolders`, `getQuota`, `thumbnailUrl`,
  `previewUrl`, `AssetRow` (Task 9); `features`, `routes` (existing,
  `lib/config`); `getProfile` (existing); `PageHeader`, `PlaceholderModule`
  (existing).
- Produces: `MediaLibraryBrowser`, `AssetSection`, `AssetSubgroup` — this task's
  own page is the only consumer of `AssetSection`/`AssetSubgroup`
  (Task 17/builder integration does not need them).

- [ ] **Step 1: Write `features/media-library/browser.tsx`**

```typescript
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HardDrive } from "lucide-react";
import { routes } from "@/lib/config";
import { formatBytes } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { AssetGrid } from "@/components/media/asset-grid";
import { UploadDropzone } from "@/components/media/upload-dropzone";
import {
  AssetDetailSheet,
  type MediaAssetDetail,
  type AssetUsageSummary,
} from "@/components/media/asset-detail-sheet";
import { updateAssetMetaAction, deleteAssetAction } from "./actions";

/**
 * Asset Browser — design doc's UI section. Sections are computed server-side
 * (app/(dashboard)/dashboard/media/page.tsx) so this component stays a plain
 * renderer regardless of which view produced them: "All" is one section, "By
 * Event" is one section per invitation (subgrouped by slot) plus "Unsorted",
 * "By Type" is one section per tag plus "Untagged" (design doc Decision 1).
 */

export interface AssetSubgroup {
  key: string;
  title: string;
  assets: MediaAssetDetail[];
}

export interface AssetSection {
  key: string;
  title: string;
  assets: MediaAssetDetail[];
  subgroups?: AssetSubgroup[];
}

const VIEWS = [
  { id: "all", label: "All" },
  { id: "byEvent", label: "By Event" },
  { id: "byType", label: "By Type" },
] as const;

export function MediaLibraryBrowser({
  view,
  sections,
  usagesByAssetId,
  quota,
  searchDefaults,
  pagination,
}: {
  view: "all" | "byEvent" | "byType";
  sections: AssetSection[];
  usagesByAssetId: Record<string, AssetUsageSummary[]>;
  quota: { totalBytes: number; totalCount: number };
  searchDefaults: { q: string; sort: string };
  pagination: { page: number; totalPages: number } | null;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  const byId = React.useMemo(() => {
    const map = new Map<string, MediaAssetDetail>();
    for (const section of sections) {
      for (const asset of section.assets) map.set(asset.id, asset);
      for (const subgroup of section.subgroups ?? []) {
        for (const asset of subgroup.assets) map.set(asset.id, asset);
      }
    }
    return map;
  }, [sections]);

  const selected = selectedId ? (byId.get(selectedId) ?? null) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground">
        <HardDrive className="size-4" aria-hidden="true" />
        {quota.totalCount} {quota.totalCount === 1 ? "photo" : "photos"} ·{" "}
        {formatBytes(quota.totalBytes)}
      </div>

      <UploadDropzone onUploaded={() => router.refresh()} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="View" className="flex gap-1">
          {VIEWS.map((option) => (
            <Link
              key={option.id}
              href={`${routes.dashboard.media}?view=${option.id}`}
              role="tab"
              aria-selected={view === option.id}
              className={
                view === option.id
                  ? "rounded-md bg-muted px-3 py-1.5 text-sm font-medium"
                  : "rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted/60"
              }
            >
              {option.label}
            </Link>
          ))}
        </div>

        {view === "all" ? (
          <form
            action={routes.dashboard.media}
            className="flex flex-wrap items-center gap-2"
          >
            <input type="hidden" name="view" value="all" />
            <Input
              type="search"
              name="q"
              defaultValue={searchDefaults.q}
              placeholder="Search filename, tags…"
              className="h-9 w-48"
            />
            <select
              name="sort"
              defaultValue={searchDefaults.sort}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="largest">Largest</option>
              <option value="name">Name</option>
            </select>
            <button
              type="submit"
              className="h-9 rounded-md border border-input px-3 text-sm font-medium hover:bg-muted"
            >
              Apply
            </button>
          </form>
        ) : null}
      </div>

      {sections.map((section) => (
        <section key={section.key} className="space-y-3">
          {section.title ? (
            <h3 className="text-sm font-semibold">{section.title}</h3>
          ) : null}

          {section.subgroups ? (
            <div className="space-y-4">
              {section.subgroups.map((subgroup) => (
                <div key={subgroup.key}>
                  <h4 className="mb-2 text-xs font-medium text-muted-foreground">
                    {subgroup.title}
                  </h4>
                  <AssetGrid
                    assets={subgroup.assets}
                    onSelect={(asset) => setSelectedId(asset.id)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <AssetGrid
              assets={section.assets}
              onSelect={(asset) => setSelectedId(asset.id)}
            />
          )}
        </section>
      ))}

      {pagination && pagination.totalPages > 1 ? (
        <div className="flex justify-center gap-2 text-sm">
          {Array.from(
            { length: pagination.totalPages },
            (_, index) => index + 1,
          ).map((page) => {
            const pageParams = new URLSearchParams({ view: "all" });
            if (searchDefaults.q) pageParams.set("q", searchDefaults.q);
            pageParams.set("sort", searchDefaults.sort);
            pageParams.set("page", String(page));

            return (
            <Link
              key={page}
              href={`${routes.dashboard.media}?${pageParams.toString()}`}
              className={
                page === pagination.page
                  ? "rounded-md bg-muted px-3 py-1.5 font-medium"
                  : "rounded-md px-3 py-1.5 text-muted-foreground hover:bg-muted/60"
              }
            >
              {page}
            </Link>
            );
          })}
        </div>
      ) : null}

      <AssetDetailSheet
        asset={selected}
        usages={selected ? (usagesByAssetId[selected.id] ?? []) : []}
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedId(null);
        }}
        onReplaced={() => router.refresh()}
        updateMetaAction={updateAssetMetaAction}
        deleteAction={deleteAssetAction}
      />
    </div>
  );
}
```

- [ ] **Step 2: Rewrite `app/(dashboard)/dashboard/media/page.tsx`**

```typescript
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Images } from "lucide-react";
import { PlaceholderModule } from "@/components/placeholder-module";
import { PageHeader } from "@/components/page-header";
import { getProfile } from "@/lib/auth/session";
import { routes, features } from "@/lib/config";
import {
  listAssets,
  searchAssets,
  getFolders,
  getQuota,
  thumbnailUrl,
  previewUrl,
  type AssetRow,
} from "@/services/media";
import {
  MediaLibraryBrowser,
  type AssetSection,
} from "@/features/media-library/browser";
import type { MediaAssetDetail, AssetUsageSummary } from "@/components/media/asset-detail-sheet";

export const metadata: Metadata = {
  title: "Media Library",
};

export const dynamic = "force-dynamic";

function toDetail(asset: AssetRow): MediaAssetDetail {
  return {
    id: asset.id,
    thumbnailUrl: thumbnailUrl(asset),
    previewUrl: previewUrl(asset),
    altText: asset.altText,
    originalFilename: asset.originalFilename,
    tags: asset.tags,
    bytes: asset.bytes,
    width: asset.width,
    height: asset.height,
    uploadedAt: asset.createdAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }),
  };
}

/**
 * Asset Browser — replaces the Phase 1 placeholder. The flag check mirrors
 * dashboard/events/page.tsx: with the library off, this must go back to being
 * an honest placeholder.
 */
export default async function MediaPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  if (!features.mediaLibrary) {
    return (
      <PlaceholderModule
        title="Media Library"
        description="Photos and files you have uploaded, reusable across events."
        icon={Images}
        phase={4}
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard.root },
          { label: "Media Library" },
        ]}
      />
    );
  }

  const profile = await getProfile();
  if (!profile) redirect(routes.login);

  const view =
    searchParams.view === "byEvent" || searchParams.view === "byType"
      ? searchParams.view
      : "all";

  const [allAssets, folders, quota] = await Promise.all([
    listAssets(profile.id),
    getFolders(profile.id),
    getQuota(profile.id),
  ]);

  const assetById = new Map(allAssets.map((asset) => [asset.id, asset]));
  const resolve = (ids: string[]) =>
    ids
      .map((id) => assetById.get(id))
      .filter((asset): asset is AssetRow => Boolean(asset))
      .map(toDetail);

  // Invert the by-event grouping into assetId -> usages, for the detail
  // panel's "Used in" list, regardless of which view is currently active.
  const usagesByAssetId: Record<string, AssetUsageSummary[]> = {};
  for (const event of folders.byEvent.events) {
    for (const [slot, assetIds] of Object.entries(event.bySlot)) {
      for (const assetId of assetIds) {
        (usagesByAssetId[assetId] ??= []).push({
          invitationId: event.invitationId,
          invitationTitle: event.title,
          slot,
        });
      }
    }
  }

  let sections: AssetSection[];
  let pagination: { page: number; totalPages: number } | null = null;
  let searchDefaults = { q: "", sort: "newest" };

  if (view === "all") {
    const result = await searchAssets(profile.id, searchParams);
    searchDefaults = { q: result.criteria.q ?? "", sort: result.criteria.sort };
    sections = [{ key: "all", title: "", assets: result.assets.map(toDetail) }];
    pagination = {
      page: result.criteria.page,
      totalPages: Math.max(
        1,
        Math.ceil(result.totalCount / result.criteria.perPage),
      ),
    };
  } else if (view === "byEvent") {
    sections = [
      ...folders.byEvent.events.map((event) => ({
        key: event.invitationId,
        title: event.title,
        assets: [],
        subgroups: Object.entries(event.bySlot).map(([slot, assetIds]) => ({
          key: slot,
          title: slot.charAt(0) + slot.slice(1).toLowerCase(),
          assets: resolve(assetIds),
        })),
      })),
      {
        key: "unsorted",
        title: "Unsorted",
        assets: resolve(folders.byEvent.unsorted),
      },
    ];
  } else {
    sections = [
      ...Object.entries(folders.byType.tags).map(([tag, assetIds]) => ({
        key: tag,
        title: tag,
        assets: resolve(assetIds),
      })),
      {
        key: "untagged",
        title: "Untagged",
        assets: resolve(folders.byType.untagged),
      },
    ];
  }

  return (
    <>
      <PageHeader
        title="Media Library"
        description="Photos you have uploaded, reusable across every event."
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard.root },
          { label: "Media Library" },
        ]}
      />

      <MediaLibraryBrowser
        view={view}
        sections={sections}
        usagesByAssetId={usagesByAssetId}
        quota={{ totalBytes: quota.totalBytes, totalCount: quota.totalCount }}
        searchDefaults={searchDefaults}
        pagination={pagination}
      />
    </>
  );
}
```

- [ ] **Step 3: Type-check and run the full unit suite**

```bash
pnpm typecheck && pnpm test
```

Expected: both exit 0.

- [ ] **Step 4: Commit**

```bash
git add features/media-library/browser.tsx "app/(dashboard)/dashboard/media/page.tsx"
git commit -m "feat(media-library): add Asset Browser with view switcher, search, and quota"
```

---

### Task 17: Builder integration — browse the full library

**Files:**
- Modify: `features/invitation-builder/media-actions.ts` (remove `uploadMedia`,
  now dead — the builder's upload goes through the shared `UploadDropzone` /
  `/api/media/upload` route like everywhere else; keep `removeMedia` and
  `MediaUploadState`, unchanged)
- Modify: `features/invitation-builder/components/steps/media-step.tsx` (full
  rewrite of the upload and grid sections)
- Modify: `app/(dashboard)/builder/[id]/[step]/page.tsx` (the `"media"` case's
  asset mapping, touched already in Task 9 for the URL-helper swap — this task
  changes the *shape*, not just the URL source)

No test file — Client Component, same convention as Task 13. Verified manually
in Task 19. This is the concrete realization of Ph3.md §7's "Connect to the
Invitation Media Library" that the file's own header comment has flagged since
Phase 3.

**Deliberate scope note:** the flat per-thumbnail delete affordance stays (via
`AssetCard`'s new `onRemove`), but there is no per-thumbnail Replace or
metadata editor in the builder picker — those go through the library's own
detail panel (Task 14/16). The builder's job is picking from and adding to the
library, not managing it; this matches Ph4.md's framing of the Library as the
single owner of asset lifecycle.

**Interfaces:**
- Consumes: `AssetGrid`, `UploadDropzone`, `MediaAssetSummary` (Task 13);
  `removeMedia`, `MediaUploadState` (existing, unchanged); `thumbnailUrl`
  (Task 9).

- [ ] **Step 1: Remove the now-dead `uploadMedia` from `media-actions.ts`**

In `features/invitation-builder/media-actions.ts`, remove the `uploadMedia`
function and its imports that become unused. The file goes from importing
`createAsset, deleteAsset` and `validateUpload` to only what `removeMedia`
needs:

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth/session";
import { deleteAsset } from "@/services/media";
import { routes } from "@/lib/config";

/**
 * Delete an assigned photo — Ph3.md §7. Upload is no longer here: it goes
 * through the shared UploadDropzone / app/api/media/upload/route.ts, the same
 * path the Media Library itself uses (services/media/index.ts's createAsset).
 */

export interface MediaUploadState {
  error?: string;
  usedBy?: string[];
}

export async function removeMedia(
  _prev: MediaUploadState,
  formData: FormData,
): Promise<MediaUploadState> {
  const profile = await getProfile();
  if (!profile) return { error: "Please sign in again." };

  const assetId = String(formData.get("assetId") ?? "");
  const result = await deleteAsset(profile.id, assetId);

  if (!result.ok) {
    return { error: result.error, usedBy: result.usedBy };
  }

  revalidatePath(routes.builder, "layout");
  return {};
}
```

- [ ] **Step 2: Rewrite `media-step.tsx`**

```typescript
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { saveMediaStep } from "../../actions";
import { removeMedia } from "../../media-actions";
import { useAutosave } from "../use-autosave";
import { SaveIndicator } from "../save-indicator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { AssetGrid } from "@/components/media/asset-grid";
import { UploadDropzone } from "@/components/media/upload-dropzone";
import type { MediaAssetSummary } from "@/components/media/asset-card";
import { notify } from "@/lib/hooks/use-toast";
import { cn } from "@/lib/utils";

/**
 * Media — Ph3.md §7. Now browses the full Media Library (search included)
 * rather than the flat list Phase 3 shipped — Ph4.md's "Connect to the
 * Invitation Media Library."
 *
 * The library is the customer's whole set of uploads; the slots are
 * references into it. §7: "Do not duplicate uploaded assets" — one photo can
 * be the cover AND a couple photo, and choosing it twice stores two
 * references, not two files.
 */

export type Slot = "COVER" | "COUPLE" | "FAMILY" | "LOGO";

export interface Assignment {
  assetId: string;
  slot: Slot;
}

const SLOTS: {
  id: Slot;
  label: string;
  description: string;
  single: boolean;
}[] = [
  {
    id: "COVER",
    label: "Cover image",
    description: "The main photo, at the top.",
    single: true,
  },
  {
    id: "COUPLE",
    label: "Couple photos",
    description: "Shown in the gallery.",
    single: false,
  },
  {
    id: "FAMILY",
    label: "Family photos",
    description: "Also shown in the gallery.",
    single: false,
  },
  {
    id: "LOGO",
    label: "Logo",
    description: "For corporate events.",
    single: true,
  },
];

export function MediaStep({
  invitationId,
  assets: initialAssets,
  initialAssignments,
}: {
  invitationId: string;
  assets: MediaAssetSummary[];
  initialAssignments: Assignment[];
}) {
  const router = useRouter();
  const [assignments, setAssignments] =
    React.useState<Assignment[]>(initialAssignments);
  const [activeSlot, setActiveSlot] = React.useState<Slot>("COVER");
  const [query, setQuery] = React.useState("");

  const save = React.useCallback(async () => {
    const formData = new FormData();
    formData.set("invitationId", invitationId);
    formData.set("assignments", JSON.stringify(assignments));
    return saveMediaStep({}, formData);
  }, [invitationId, assignments]);

  const autosave = useAutosave({ save });

  function toggle(assetId: string, slot: Slot) {
    const definition = SLOTS.find((s) => s.id === slot)!;
    const already = assignments.some(
      (a) => a.assetId === assetId && a.slot === slot,
    );

    setAssignments((current) => {
      if (already)
        return current.filter(
          (a) => !(a.assetId === assetId && a.slot === slot),
        );

      const cleared = definition.single
        ? current.filter((a) => a.slot !== slot)
        : current;
      return [...cleared, { assetId, slot }];
    });

    autosave.markDirty();
  }

  async function handleRemove(asset: MediaAssetSummary) {
    const formData = new FormData();
    formData.set("assetId", asset.id);
    const result = await removeMedia({}, formData);

    if (result.error) {
      // Ph4.md §11 — name what is using it rather than just refusing.
      notify.error({
        title: "Cannot delete that image",
        description: result.usedBy?.length
          ? `${result.error} Used by: ${result.usedBy.join(", ")}.`
          : result.error,
      });
      return;
    }

    setAssignments((current) => current.filter((a) => a.assetId !== asset.id));
    router.refresh();
  }

  const filteredAssets = React.useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return initialAssets;
    return initialAssets.filter(
      (asset) =>
        asset.originalFilename.toLowerCase().includes(term) ||
        asset.tags.some((tag) => tag.includes(term)),
    );
  }, [initialAssets, query]);

  const assignedIdsForActiveSlot = assignments
    .filter((a) => a.slot === activeSlot)
    .map((a) => a.assetId);

  return (
    <>
      <div className="mb-4 flex justify-end">
        <SaveIndicator autosave={autosave} />
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upload a photo</CardTitle>
            <CardDescription>
              JPG, PNG, WebP, or HEIC, up to 10 MB. Upload once — you can use
              the same photo in more than one place.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UploadDropzone onUploaded={() => router.refresh()} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assign photos</CardTitle>
            <CardDescription>
              Pick a slot, then tap the photos that belong in it — search your
              whole library if you have more than a few.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              role="tablist"
              aria-label="Photo slot"
              className="flex flex-wrap gap-1"
            >
              {SLOTS.map((slot) => {
                const count = assignments.filter(
                  (a) => a.slot === slot.id,
                ).length;

                return (
                  <button
                    key={slot.id}
                    role="tab"
                    type="button"
                    aria-selected={activeSlot === slot.id}
                    onClick={() => setActiveSlot(slot.id)}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      activeSlot === slot.id
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    {slot.label}
                    {count > 0 ? (
                      <span className="rounded-full bg-foreground px-1.5 text-[10px] text-background">
                        {count}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>

            <p className="text-xs text-muted-foreground">
              {SLOTS.find((s) => s.id === activeSlot)!.description}
            </p>

            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your photos by filename or tag"
              aria-label="Search your photos"
            />

            <AssetGrid
              assets={filteredAssets}
              selectedIds={assignedIdsForActiveSlot}
              onSelect={(asset) => toggle(asset.id, activeSlot)}
              onRemove={handleRemove}
              emptyTitle={
                initialAssets.length === 0 ? "No photos yet" : "No matches"
              }
              emptyDescription={
                initialAssets.length === 0
                  ? "Upload one above to get started."
                  : "Try a different search term."
              }
            />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
```

- [ ] **Step 3: Update the builder step page's `"media"` case to the shared asset shape**

In `app/(dashboard)/builder/[id]/[step]/page.tsx`, change the `"media"` case
(already touched once in Task 9) from:

```typescript
      case "media": {
        const assets = await listAssets(profile!.id);
        // Proxy URLs, built from id+version — no signed URL ever reaches the
        // client (design doc Decision 4).

        return (
          <MediaStep
            invitationId={draft!.id}
            assets={assets.map((asset) => ({
              id: asset.id,
              url: thumbnailUrl(asset),
              altText: asset.altText,
              originalFilename: asset.originalFilename,
            }))}
```

to:

```typescript
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
```

(No other line in this case changes — `initialAssignments` below it is
untouched.)

- [ ] **Step 4: Type-check and run the full unit suite**

```bash
pnpm typecheck && pnpm test
```

Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
git add features/invitation-builder/media-actions.ts features/invitation-builder/components/steps/media-step.tsx "app/(dashboard)/builder/[id]/[step]/page.tsx"
git commit -m "feat(invitation-builder): browse the full Media Library from the media step"
```

---

### Task 18: Full verification, CHANGELOG entry, and final self-review

**Files:**
- Modify: `CHANGELOG.md` (append a Phase 4 entry under `## [Unreleased]` →
  `### Added`, following the Phase 3 entry's style read at the start of this
  plan)

**Interfaces:** none — this task verifies everything Tasks 1–17 built and
records it; it produces no new code.

- [ ] **Step 1: Full automated verification**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Expected: all four exit 0. `pnpm build` succeeding without `.env.local`
populated in a fresh shell (or with it temporarily renamed) re-confirms the
CI-without-secrets guarantee this codebase depends on — every new
Prisma/Supabase-touching module in this plan degrades via
`isDatabaseConfigured()`/`isSupabaseConfigured()` rather than throwing at
import time.

- [ ] **Step 2: Manual verification against a real database**

Design doc's "Testing approach" section names this explicitly as the
verification method for everything DB- and Storage-backed. Start the local
dev database and app:

```bash
pnpm db:local
```

In another terminal, with `.env.local`'s `DATABASE_URL` pointed at it (per
`docs/deployment-workflow.md`'s `pnpm db:local` section):

```bash
pnpm prisma:migrate --name verify_phase4 --create-only && pnpm prisma:deploy
pnpm dev
```

(`--create-only` on an already-migrated schema should report "no changes" —
this just confirms the schema and the local database still agree before
manual testing.) Then, signed in as a test customer:

- [ ] Upload a JPG/PNG through the Media Library's Upload Manager
      (`/dashboard/media`). Confirm: a progress bar animates, the grid
      refreshes with the new thumbnail, and the thumbnail is visibly a
      re-encoded, right-sized image (not the raw original).
- [ ] Upload several files at once. Confirm each gets its own progress bar and
      they complete independently.
- [ ] Start an upload and click Cancel mid-transfer. Confirm the row shows
      "Cancelled" and no `MediaAsset` row was created for it (check
      `pnpm prisma:studio`).
- [ ] Open an asset's detail panel. Confirm the large preview loads, metadata
      (filename, size, dimensions, upload date) is correct, and Alt
      Text/Tags save and persist across a reload.
- [ ] Replace an asset with a different photo. Confirm: the version number in
      `pnpm prisma:studio` incremented, every place the asset was already
      referenced (e.g. the builder's cover slot) now shows the new photo, and
      the previous version's three storage objects are gone from the Supabase
      Storage browser.
- [ ] Assign an asset to an invitation (via the builder's media step), then try
      to delete it from the Media Library. Confirm the delete is refused and
      names the invitation.
- [ ] Unassign it (remove the reference from the builder), then delete it
      again. Confirm it succeeds and its storage objects are gone.
- [ ] Switch the Asset Browser to "By Event." Confirm assets sub-group by
      slot within each event, and any zero-usage asset appears under
      "Unsorted."
- [ ] Switch to "By Type." Confirm assets group by tag, with untagged assets
      under "Untagged."
- [ ] Search by filename and by tag in the "All" view. Confirm results match
      and the URL reflects the query (shareable link, per criteria.ts's
      documented rationale).
- [ ] Confirm the quota bar's photo count and total size match
      `pnpm prisma:studio`'s `media_assets` rows for that profile.
- [ ] In the builder's media step, confirm the search box filters the grid,
      the same asset can be assigned to more than one slot, and the per-photo
      delete icon works.
- [ ] Request `/api/media/<real-asset-id>/<real-version>/original` while
      signed in as a *different* customer. Confirm a 404, not the image —
      this is the ownership check from Task 10.
- [ ] Request an old version's URL after replacing an asset (e.g. re-use a
      previously noted `/api/media/<id>/1/original` after replacing to
      version 2). Confirm a 404 — the design doc's expected stale-URL
      behavior.
- [ ] If a HEIC test file is available, upload it and confirm the asset is
      created with no thumbnail/preview (falls back to the original) rather
      than the whole upload failing — the graceful-degradation path.

- [ ] **Step 3: Append the CHANGELOG entry**

Add a new bullet group to `CHANGELOG.md` under `## [Unreleased]` → `### Added`,
immediately before the existing "Phase 3 — Guided Invitation Builder" entry
(newest phase first, matching this file's existing order):

```markdown
- Phase 4 — Invitation Media Library.
  - Computed virtual folders (Ph4.md §2, §9): assets group "By Event" and "By
    Type" as read-time views over the existing asset pool and usage join —
    never a stored folder table, since one photo may belong to many events.
  - Replace Asset (§10): same id, new bytes, an incrementing `version` field —
    every existing reference updates automatically, with no version history
    kept.
  - A real Upload Manager (§3): drag-and-drop, multi-file, per-file progress,
    retry, and cancel — the one place in the app that uses a Route Handler
    instead of a Server Action, because Server Actions cannot expose
    upload-progress events.
  - Image processing (§5): `sharp`-generated thumbnail and preview variants at
    upload time, re-encoded to WebP (which strips EXIF/GPS metadata as a side
    effect), served through an authenticated proxy route
    (`/api/media/[assetId]/[version]/[variant]`) with safe immutable caching —
    never a rotating Supabase signed URL. Degrades to the original alone when
    a file (e.g. some HEIC images) can't be decoded.
  - Search (§8) and a storage quota summary (§12), following the same
    criteria/query pattern Phase 2's marketplace established.
  - The Guided Invitation Builder's media step now browses the full library
    (Ph3.md §7's "Connect to the Invitation Media Library"), replacing the
    flat per-invitation list Phase 3 shipped as a placeholder.
```

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: add Phase 4 changelog entry"
```

---

## Self-Review

**Spec coverage** (against
`docs/superpowers/specs/2026-07-18-phase4-media-library-design.md`):

| Design doc section | Task |
|---|---|
| Decision 1 — computed folders | Task 4 (`folders.ts`), Task 16 (page wiring) |
| Decision 2 — in-place replace, version-only | Task 1 (`version` column), Task 9 (`replaceAsset`) |
| Decision 3 — real Upload Manager | Tasks 11–13 (route, hook, dropzone) |
| Decision 4 — proxy + sync `sharp` processing | Tasks 2–3, 9–10 (paths, processing, barrel, serving route) |
| Data model changes (`tags`, `version`, `VIDEO`) | Task 1 |
| Folders/search/quota | Tasks 4–6, 8 (folders, criteria, query, quota in repository) |
| Asset Browser UI | Task 16 |
| Upload Manager UI | Tasks 12–13 |
| Replace UI | Task 14 (reuses `UploadDropzone` in `assetId` mode) |
| Delete UI | Task 14 (reuses existing delete-protection semantics) |
| Builder integration | Task 17 |
| Error handling cross-reference | Tasks 9–10 (write-then-delete ordering, 404 on stale version) |
| Testing approach | Every pure module (Tasks 2, 4–6) unit-tested; DB/storage-backed modules verified in Task 18 |
| Out of scope | Nothing in this plan builds website/PDF generation, AI features, video editing, non-image upload paths, SVG, sharing, or quota enforcement — confirmed absent from every task above |
| API contract for future consumers | Task 9's barrel is the only export surface; no task adds a feature import into `services/media` |

No gaps found.

**Placeholder scan:** every task above contains complete code, exact file
paths, and exact commands with expected output. No task says "add appropriate
error handling," "similar to Task N," or leaves a function body undefined.

**Type consistency check:**
- `AssetRow` (Task 2) is used identically in `paths.ts`, `folders.ts`,
  `repository.ts`, and `index.ts` — `id`, `profileId`, `bucket`,
  `storagePath`, `kind`, `mimeType`, `bytes`, `originalFilename`, `altText`,
  `tags`, `version`, `width`, `height`, `createdAt`.
- `MediaVariant` (`"original" | "thumbnail" | "preview"`) is the same union
  everywhere it appears: `paths.ts`, `storage.ts`, `index.ts`, and the Task 10
  route's `Variant` type.
- `MediaAssetSummary` (Task 13) and `MediaAssetDetail` (Task 14, which extends
  it) are used with matching field names (`thumbnailUrl`, not `url`; `tags`
  present) in Task 16's `browser.tsx`/page.tsx and Task 17's `media-step.tsx`/
  builder page — both Task 9 and Task 17 touch the same block in
  `app/(dashboard)/builder/[id]/[step]/page.tsx`, and Task 17's Step 3 quotes
  Task 9's exact resulting code as its "from" state to keep the diff honest.
- `MetaFormState`/`DeleteFormState` are declared once in
  `components/media/asset-detail-sheet.tsx` (Task 14) and once more,
  independently, in `features/media-library/actions.ts` (Task 15) — deliberate
  structural (not nominal) compatibility, documented in both tasks, so that
  `components/media` never imports from any feature.
- `EnqueueOptions.assetId` (Task 12) is threaded consistently through
  `UploadDropzone` (Task 13) and `app/api/media/upload/route.ts`'s `assetId`
  form field (Task 11) — the replace-mode path is introduced once, in Task 11,
  before Task 12/13/14 all rely on it.

No inconsistencies found.
