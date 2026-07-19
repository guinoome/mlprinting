# Phase 5 Website Generator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn a completed invitation into a real, live, guest-facing event website —
public route, publish/unpublish control, RSVP collection and viewing, countdown, maps
link, gallery, and a QR code — per
`docs/superpowers/specs/2026-07-19-phase5-website-generator-design.md`.

**Architecture:** A new `features/website-generator/` feature owns the public route's
data reads, RSVP storage, and publish control — mirroring every other feature's
per-feature `repository.ts`/`actions.ts` split. The view-model contract Phase 3 built
(`toPreviewModel`) relocates from `features/invitation-builder/` to `lib/invitation/`,
a shared home, so this new feature can consume it without a cross-feature import. Ph4's
media-serving route gains a second, additive authorization path (published-invitation
visibility) alongside its existing session-ownership check — one route serves both the
dashboard and the public site.

**Tech Stack:** Next.js 14 (App Router), Prisma 6, PostgreSQL, `qrcode` (new dependency,
MIT-licensed, server-side QR image generation), Zod, Vitest.

## Global Constraints

- Zero cross-feature imports: `features/website-generator` and
  `features/invitation-builder` never import from each other. The one shared contract
  (`toPreviewModel`/`PreviewModel`/`PreviewInput`) lives in `lib/invitation/`, not inside
  either feature.
- Every server-only module that touches Prisma or Supabase starts with
  `import "server-only";`, matching every existing service/repository in this codebase.
- Every Prisma-backed read degrades to an empty/null result when
  `isDatabaseConfigured()` is false — never throw. `next build` runs in CI without a
  `DATABASE_URL`.
- The public route and its Server Actions require **no session** — guests have no
  ML-DEP account. Every other new dashboard route requires one, matching every existing
  dashboard page.
- A `DRAFT` invitation, or one with `isPublished: false`, must never be reachable at its
  public URL, indexable by search engines, or have its media servable to a guest —
  regardless of whether the slug is known. Publish state is the actual boundary, not
  slug obscurity.
- Publishing requires `Invitation.status === "COMPLETED"`, enforced **inside** the
  publish Server Action itself — not just by where its UI is shown.
- No embedded/live Google Maps (JS API) — a link-out only, per the free-tier-only
  constraint (V1.md §11).
- No test may require a live database in CI. Pure logic (slug validation, countdown
  time-remaining calculation, the relocated `toPreviewModel`) gets Vitest unit tests.
  Prisma-backed reads/writes are verified manually via `pnpm db:local`, matching every
  repository in this codebase.

---

## File Structure

```
prisma/
  schema.prisma                                       (modify)
  migrations/<ts>_phase5_website_generator/migration.sql (create)

lib/config/
  routes.ts       (modify) — add publicEvent, dashboard.eventWebsite, dashboard.eventRsvps
  features.ts     (modify) — add websiteGenerator flag
.env.example       (modify) — add NEXT_PUBLIC_FEATURE_WEBSITE_GENERATOR

lib/invitation/
  preview-model.ts       (create — relocated from features/invitation-builder/preview/model.ts)
  preview-model.test.ts  (create — relocated, unchanged)
features/invitation-builder/
  preview/model.ts         (delete)
  preview/model.test.ts    (delete)
  components/steps/preview-step.tsx  (modify — import path only)
app/(dashboard)/builder/[id]/[step]/page.tsx           (modify — import path only)

features/website-generator/
  slug.ts             (create) — pure slug normalization/validation
  slug.test.ts        (create)
  repository.ts       (create) — Prisma reads/writes for public rendering, publish, RSVP
  actions.ts          (create) — submitRsvp, publishInvitation, unpublishInvitation
  countdown-time.ts       (create) — pure "time remaining" calculation
  countdown-time.test.ts  (create)
  components/
    countdown.tsx       (create) — client, ticks from countdown-time.ts
    rsvp-form.tsx       (create) — client, wraps submitRsvp
    event-site.tsx      (create) — the public page's presentational render

services/media/
  repository.ts   (modify) — add isAssetPublic, findAssetByIdUnscoped
  index.ts        (modify) — add getPublicAsset, re-export isAssetPublic
app/api/media/[assetId]/[version]/[variant]/route.ts  (modify) — dual auth path

lib/qr.ts                          (create) — pure wrapper over the `qrcode` package
app/api/qr/[slug]/route.ts         (create) — serves a QR image for a published site

app/e/[slug]/page.tsx              (create) — the public website route + generateMetadata

app/(dashboard)/dashboard/events/[id]/rsvps/page.tsx    (create)
app/(dashboard)/dashboard/events/[id]/website/page.tsx  (create)

features/invitation-builder/components/draft-menu.tsx  (modify) — add "Manage website" entry

CHANGELOG.md   (modify) — Phase 5 entry under [Unreleased]
```

---

### Task 1: Schema — `slug`, `isPublished`, `RsvpResponse`

**Files:**
- Modify: `prisma/schema.prisma` (the `Invitation` model)
- Create: `prisma/migrations/<timestamp>_phase5_website_generator/migration.sql`

**Interfaces:**
- Produces: `Invitation.slug: string | null`, `Invitation.isPublished: boolean`,
  `Invitation.rsvps` relation, and the new `RsvpResponse` model — every later task
  reads or writes these.

- [ ] **Step 1: Edit the `Invitation` model**

In `prisma/schema.prisma`, change the tail of the model from:

```prisma
  // --- Autosave (Ph3.md §8) ---
  lastSavedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  /// Set when the customer finishes (Ph3.md §1 step 10). Ph3 goes no further —
  /// the order workflow is Ph7.
  completedAt DateTime?

  profile         Profile                    @relation(fields: [profileId], references: [id], onDelete: Cascade)
  template        Template?                  @relation(fields: [templateId], references: [id], onDelete: SetNull)
  hosts           InvitationHost[]
  venues          InvitationVenue[]
  content         InvitationContent?
  people          InvitationPerson[]
  program         ProgramItem[]
  personalization InvitationPersonalization?
  media           InvitationMedia[]

  @@index([profileId, status, updatedAt])
  @@index([templateId])
  @@map("invitations")
}
```

to:

```prisma
  // --- Autosave (Ph3.md §8) ---
  lastSavedAt DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  /// Set when the customer finishes (Ph3.md §1 step 10). Ph3 goes no further —
  /// the order workflow is Ph7.
  completedAt DateTime?

  // --- Public website (Ph5.md) ---
  /// Public website identifier, chosen by the customer at publish time — never
  /// during the builder. Doubles as the access-control boundary alongside
  /// isPublished; there is no separate opaque id underneath it.
  slug        String?  @unique
  /// The single guest-visibility boundary. "Never published" and "unpublished"
  /// are identical to every access check and to a guest (the route is not live
  /// either way) — the only difference is UI copy, derived from whether slug
  /// is already set. No enum, no extra state to keep consistent.
  isPublished Boolean  @default(false)

  profile         Profile                    @relation(fields: [profileId], references: [id], onDelete: Cascade)
  template        Template?                  @relation(fields: [templateId], references: [id], onDelete: SetNull)
  hosts           InvitationHost[]
  venues          InvitationVenue[]
  content         InvitationContent?
  people          InvitationPerson[]
  program         ProgramItem[]
  personalization InvitationPersonalization?
  media           InvitationMedia[]
  rsvps           RsvpResponse[]

  @@index([profileId, status, updatedAt])
  @@index([templateId])
  @@map("invitations")
}
```

- [ ] **Step 2: Add the `RsvpResponse` model**

Append after the `InvitationMedia` model (end of `prisma/schema.prisma`):

```prisma

/// A guest's response — Ph5.md §3. No guest accounts, no edit-after-submit: a
/// second submission from the same guest is a second row, not an upsert. The
/// customer's RSVP list can show both — deduping by name is unreliable (two
/// invited "Maria Santos" are not the same guest) and deliberately not
/// attempted.
model RsvpResponse {
  id           String   @id @default(uuid()) @db.Uuid
  invitationId String   @db.Uuid

  guestName  String
  attending  Boolean
  guestCount Int      @default(1)
  message    String?
  createdAt  DateTime @default(now())

  invitation Invitation @relation(fields: [invitationId], references: [id], onDelete: Cascade)

  @@index([invitationId, createdAt])
  @@map("rsvp_responses")
}
```

- [ ] **Step 3: Start the local dev database**

```bash
pnpm db:local
```

Expected: PGlite listening on `127.0.0.1:55432`.

- [ ] **Step 4: Generate the migration**

`prisma migrate dev` is confirmed broken against this project's local PGlite database
(a wire-protocol incompatibility in its schema-engine diagnostic RPC — see Phase 4's
plan, Task 1, for the full diagnosis). Use `migrate diff` + `migrate deploy` instead,
never `migrate dev`/`prisma:migrate`:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:55432/postgres?pgbouncer=true&connection_limit=1" \
  npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script > /tmp/phase5-diff.sql
```

Expected: SQL with one `ALTER TABLE "invitations" ADD COLUMN "slug" TEXT` (plus a
separate `CREATE UNIQUE INDEX` for the `@unique`), one `ADD COLUMN "isPublished"
BOOLEAN NOT NULL DEFAULT false`, and one `CREATE TABLE "rsvp_responses"` with a
foreign key to `invitations` and an index on `(invitationId, createdAt)`. Nothing
destructive. If this command hits the same wire-protocol error Task 1 of the Phase 4
plan diagnosed, hand-author the SQL instead, matching the style of an existing
migration file in `prisma/migrations/` (e.g. `20260718101956_phase4_media_library`).

- [ ] **Step 5: Create the migration file and apply it**

```bash
mkdir -p "prisma/migrations/$(date +%Y%m%d%H%M%S)_phase5_website_generator"
```

Move the generated SQL into `migration.sql` inside that new folder, then:

```bash
pnpm prisma:deploy
```

Expected: exits 0, reports the new migration applied. Do **not** use
`pnpm prisma:migrate` (`migrate dev`) for this — see Step 4.

- [ ] **Step 6: Regenerate the Prisma client**

```bash
pnpm prisma:generate
```

Expected: exits 0. The client now types `Invitation.slug`, `Invitation.isPublished`,
`Invitation.rsvps`, and the `RsvpResponse` model.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(website): add Invitation.slug/isPublished and RsvpResponse"
```

---

### Task 2: Routes, feature flag, env

**Files:**
- Modify: `lib/config/routes.ts`
- Modify: `lib/config/features.ts`
- Modify: `.env.example`

**Interfaces:**
- Produces: `routes.publicEvent(slug)`, `routes.dashboard.eventWebsite(id)`,
  `routes.dashboard.eventRsvps(id)`, `features.websiteGenerator` — every later task
  that builds a route or gates on the flag imports these.

- [ ] **Step 1: Add routes**

In `lib/config/routes.ts`, change:

```typescript
  dashboard: {
    root: "/dashboard",
    events: "/dashboard/events",
    orders: "/dashboard/orders",
    media: "/dashboard/media",
    notifications: "/dashboard/notifications",
    account: "/dashboard/account",
  },
```

to:

```typescript
  dashboard: {
    root: "/dashboard",
    events: "/dashboard/events",
    orders: "/dashboard/orders",
    media: "/dashboard/media",
    notifications: "/dashboard/notifications",
    account: "/dashboard/account",
    /** Publish control — Ph5.md's "Manage website" surface. */
    eventWebsite: (id: string) => `/dashboard/events/${id}/website`,
    /** RSVP list — Ph5.md §3. */
    eventRsvps: (id: string) => `/dashboard/events/${id}/rsvps`,
  },
```

And add, at the top level alongside `templates`/`builder` (after the `builderStep`
line):

```typescript
  /**
   * The public event website — Ph5.md. No auth: guests have no ML-DEP account.
   * `slug` is the customer-chosen identifier from Invitation.slug.
   */
  publicEvent: (slug: string) => `/e/${slug}`,
```

- [ ] **Step 2: Add the feature flag**

In `lib/config/features.ts`, add after `get payments()`:

```typescript
  /** Ph5 — Website Generator */
  get websiteGenerator() {
    return flag("NEXT_PUBLIC_FEATURE_WEBSITE_GENERATOR");
  },
```

- [ ] **Step 3: Add the env var**

In `.env.example`, add after `NEXT_PUBLIC_FEATURE_PDF_GENERATION=` (keeping the
existing phase order):

```
NEXT_PUBLIC_FEATURE_WEBSITE_GENERATOR=
```

Wait — reorder so flags stay in phase order (`Ph4` media, `Ph5` website, `Ph6` PDF).
Full block after this edit:

```
NEXT_PUBLIC_FEATURE_TEMPLATE_MARKETPLACE=
NEXT_PUBLIC_FEATURE_INVITATION_BUILDER=
NEXT_PUBLIC_FEATURE_MEDIA_LIBRARY=
NEXT_PUBLIC_FEATURE_WEBSITE_GENERATOR=
NEXT_PUBLIC_FEATURE_PDF_GENERATION=
NEXT_PUBLIC_FEATURE_BOOKING=
NEXT_PUBLIC_FEATURE_PAYMENTS=
# Leave blank to allow sign-ups; set to "false" to close registration.
NEXT_PUBLIC_FEATURE_REGISTRATION=
```

Also add the matching line to your own `.env.local` (gitignored, not part of this
commit) if you want the flag on while developing this phase locally.

- [ ] **Step 4: Type-check**

```bash
pnpm typecheck
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add lib/config/routes.ts lib/config/features.ts .env.example
git commit -m "feat(website): add public event, publish, and RSVP routes + feature flag"
```

---

### Task 3: Relocate the shared preview view model

**Files:**
- Create: `lib/invitation/preview-model.ts` (relocated, contents unchanged)
- Create: `lib/invitation/preview-model.test.ts` (relocated, contents unchanged)
- Delete: `features/invitation-builder/preview/model.ts`
- Delete: `features/invitation-builder/preview/model.test.ts`
- Modify: `features/invitation-builder/components/steps/preview-step.tsx` (one import line)
- Modify: `app/(dashboard)/builder/[id]/[step]/page.tsx` (one import line)
- Modify: `features/invitation-builder/preview/invitation-preview.tsx` (one import line —
  also relatively imports the moved file; easy to miss since it lives in the same
  directory as `model.ts` rather than reaching across features like the other two)
- Modify: `lib/invitation/preview-model.test.ts` (its own internal `from "./model"`
  import must become `from "./preview-model"`, since the sibling file is renamed, not
  just relocated, as part of the move)

`features/invitation-builder/preview/model.ts`'s own doc comment already says this
phase should import `toPreviewModel` — but doing so from its current location would be
a `features/website-generator` → `features/invitation-builder` cross-feature import.
This task moves the file to a shared location instead, so the rule stays intact rather
than gaining an exception. The move is mechanical: file contents do not change, only
their path and the two places that import them.

**Interfaces:**
- Consumes: nothing new.
- Produces: `toPreviewModel`, `PreviewInput`, `PreviewModel`, `PreviewStyle`,
  `PreviewSurface`, `formatDate`, `formatTime`, `shows` — now importable from
  `@/lib/invitation/preview-model` by both `features/invitation-builder` and (from
  Task 9 onward) `features/website-generator`.

- [ ] **Step 1: Copy the files to their new location, unchanged**

```bash
mkdir -p lib/invitation
git mv features/invitation-builder/preview/model.ts lib/invitation/preview-model.ts
git mv features/invitation-builder/preview/model.test.ts lib/invitation/preview-model.test.ts
```

Do not edit either file's contents — this step is the move itself.

- [ ] **Step 2: Update `preview-step.tsx`'s import**

In `features/invitation-builder/components/steps/preview-step.tsx`, change:

```typescript
import type { PreviewModel } from "../../preview/model";
```

to:

```typescript
import type { PreviewModel } from "@/lib/invitation/preview-model";
```

- [ ] **Step 3: Update the builder step page's import**

In `app/(dashboard)/builder/[id]/[step]/page.tsx`, change:

```typescript
import { toPreviewModel } from "@/features/invitation-builder/preview/model";
```

to:

```typescript
import { toPreviewModel } from "@/lib/invitation/preview-model";
```

- [ ] **Step 4: Update `invitation-preview.tsx`'s import and the relocated test's own import**

In `features/invitation-builder/preview/invitation-preview.tsx`, change:

```typescript
import { shows, type PreviewModel, type PreviewSurface } from "./model";
```

to:

```typescript
import {
  shows,
  type PreviewModel,
  type PreviewSurface,
} from "@/lib/invitation/preview-model";
```

In `lib/invitation/preview-model.test.ts`, change its own internal import from:

```typescript
} from "./model";
```

to:

```typescript
} from "./preview-model";
```

This is the one line inside the relocated test file that legitimately changes as part
of the move — the sibling file was renamed (`model.ts` → `preview-model.ts`), not just
relocated to a same-named file in a new directory.

- [ ] **Step 5: Run the full suite**

```bash
pnpm typecheck && pnpm test
```

Expected: both exit 0. The relocated test file's 25 tests still run and pass, just from
their new path — no test *behavior* changed, only the one import line above.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: relocate the shared preview view model out of invitation-builder"
```

---

### Task 4: `features/website-generator/slug.ts` — slug validation

**Files:**
- Create: `features/website-generator/slug.ts`
- Test: `features/website-generator/slug.test.ts`

**Interfaces:**
- Produces: `normalizeSlug(input)`, `validateSlug(candidate)`, `SlugValidationFailure` —
  Task 6's repository (`isSlugAvailable`) and Task 11's publish action both consume
  this.

- [ ] **Step 1: Write the failing test**

Create `features/website-generator/slug.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { normalizeSlug, validateSlug } from "./slug";

describe("normalizeSlug", () => {
  it("trims and lowercases", () => {
    expect(normalizeSlug("  Ana-And-Ben  ")).toBe("ana-and-ben");
  });
});

describe("validateSlug", () => {
  it("accepts a well-formed slug", () => {
    expect(validateSlug("ana-and-ben-2026")).toBeNull();
  });

  it("accepts a slug with no hyphens", () => {
    expect(validateSlug("anaandben")).toBeNull();
  });

  it("rejects a slug shorter than 3 characters", () => {
    expect(validateSlug("ab")?.code).toBe("too-short");
  });

  it("rejects a slug longer than 60 characters", () => {
    expect(validateSlug("a".repeat(61))?.code).toBe("too-long");
  });

  it("accepts a slug at exactly 60 characters", () => {
    expect(validateSlug("a".repeat(60))).toBeNull();
  });

  it("rejects uppercase letters", () => {
    expect(validateSlug("Ana-Ben")?.code).toBe("invalid-characters");
  });

  it("rejects spaces", () => {
    expect(validateSlug("ana and ben")?.code).toBe("invalid-characters");
  });

  it("rejects a leading hyphen", () => {
    expect(validateSlug("-ana-ben")?.code).toBe("invalid-characters");
  });

  it("rejects a trailing hyphen", () => {
    expect(validateSlug("ana-ben-")?.code).toBe("invalid-characters");
  });

  it("rejects a doubled hyphen", () => {
    expect(validateSlug("ana--ben")?.code).toBe("invalid-characters");
  });

  it("rejects an underscore", () => {
    expect(validateSlug("ana_ben")?.code).toBe("invalid-characters");
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
pnpm test:watch --run features/website-generator/slug.test.ts
```

Expected: FAIL — `Cannot find module './slug'`.

- [ ] **Step 3: Write `features/website-generator/slug.ts`**

```typescript
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
```

- [ ] **Step 4: Run the test again and confirm it passes**

```bash
pnpm test:watch --run features/website-generator/slug.test.ts
```

Expected: PASS — 11 tests.

- [ ] **Step 5: Commit**

```bash
git add features/website-generator/slug.ts features/website-generator/slug.test.ts
git commit -m "feat(website): add public slug validation"
```

---

### Task 5: Guest media access — extend the serving route

**Files:**
- Modify: `services/media/repository.ts` (add two functions)
- Modify: `services/media/index.ts` (add one function, re-export one)
- Modify: `app/api/media/[assetId]/[version]/[variant]/route.ts` (dual auth path)

Design doc Decision 4: the existing serving route currently requires a session and
checks ownership. It gains a second, additive path — an asset is servable if the
caller owns it (unchanged) **or** it's referenced by at least one currently-published
invitation (new). No new route, no new bucket.

No test file for the repository/index changes (Prisma-backed, matches this codebase's
convention). No test file for the route (needs a live session or a published
invitation to exercise meaningfully — verified manually in the final task).

**Interfaces:**
- Consumes: `prisma`, `isDatabaseConfigured`, `logger` (existing, `services/media/repository.ts`
  already imports all three).
- Produces: `isAssetPublic(assetId)`, `findAssetByIdUnscoped(assetId)` from
  `repository.ts`; `getPublicAsset(assetId)` from the `services/media` barrel — the
  route (Step 3) is the only consumer of `getPublicAsset`.

- [ ] **Step 1: Add two functions to `services/media/repository.ts`**

Add after `findAssetById` (which stays unchanged — this task does not touch it):

```typescript
/**
 * The same fetch as `findAssetById`, without the `profileId` scope — for the
 * one case where ownership isn't the question: a guest viewing a published
 * invitation's photo has no profile to scope by. Only call this after
 * confirming public visibility (`isAssetPublic`) or ownership some other way —
 * this function alone proves nothing about who may see the result.
 */
export async function findAssetByIdUnscoped(
  assetId: string,
): Promise<AssetRow | null> {
  if (!isDatabaseConfigured()) return null;

  try {
    return await prisma.mediaAsset.findUnique({
      where: { id: assetId },
      select: ASSET_SELECT,
    });
  } catch (error) {
    logger.report(error, { at: "findAssetByIdUnscoped", assetId });
    return null;
  }
}

/**
 * True when at least one currently-published invitation references this
 * asset — design doc Decision 4 (guest media access). Publish state is the
 * boundary, not session ownership, for exactly this one query.
 */
export async function isAssetPublic(assetId: string): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  try {
    const usage = await prisma.invitationMedia.findFirst({
      where: { assetId, invitation: { isPublished: true } },
      select: { assetId: true },
    });
    return usage !== null;
  } catch (error) {
    logger.report(error, { at: "isAssetPublic", assetId });
    return false;
  }
}
```

- [ ] **Step 2: Add `getPublicAsset` to `services/media/index.ts`**

Add near `getAsset`:

```typescript
/**
 * An asset if — and only if — it's referenced by at least one currently
 * published invitation. Not scoped to any session; this is the guest-facing
 * counterpart to `getAsset`, which is scoped to a profile.
 */
export async function getPublicAsset(assetId: string): Promise<AssetRow | null> {
  const isPublic = await isAssetPublic(assetId);
  if (!isPublic) return null;
  return findAssetByIdUnscoped(assetId);
}
```

Add `isAssetPublic` and `findAssetByIdUnscoped` to the existing import from
`./repository` at the top of the file, and add `getPublicAsset` to the file's list of
exports consumers rely on (no barrel re-export line needed beyond the function
definition itself, matching how `getAsset` is already defined directly in this file).

- [ ] **Step 3: Modify the serving route**

In `app/api/media/[assetId]/[version]/[variant]/route.ts`, change:

```typescript
import { type NextRequest } from "next/server";
import { getProfile } from "@/lib/auth/session";
import { getAsset, hasVariants, assetObjectPath } from "@/services/media";
import { extensionOf } from "@/services/upload";
import { signedUrl } from "@/services/upload/storage";
```

to:

```typescript
import { type NextRequest } from "next/server";
import { getProfile } from "@/lib/auth/session";
import {
  getAsset,
  getPublicAsset,
  hasVariants,
  assetObjectPath,
} from "@/services/media";
import { extensionOf } from "@/services/upload";
import { signedUrl } from "@/services/upload/storage";
```

And change:

```typescript
  const profile = await getProfile();
  if (!profile) return new Response("Unauthorized", { status: 401 });

  // Scoped to the caller: this is what stops one customer requesting another's
  // photo by guessing an id, same reasoning as deleteAsset's ownership check.
  const asset = await getAsset(profile.id, params.assetId);
  if (!asset) return new Response("Not found", { status: 404 });
```

to:

```typescript
  // Two ways in: the caller owns this asset (dashboard, media library, the
  // builder's own preview), or it's used by a currently published invitation
  // (a guest viewing the live site — design doc Decision 4). Neither check
  // reveals which reason failed; both dead ends return the same 404.
  const profile = await getProfile();
  const asset = profile
    ? ((await getAsset(profile.id, params.assetId)) ??
      (await getPublicAsset(params.assetId)))
    : await getPublicAsset(params.assetId);

  if (!asset) return new Response("Not found", { status: 404 });
```

(No other line in this route changes — the version check, variant/`hasVariants` check,
signed-URL fetch, and response headers all stay exactly as Ph4 built them.)

- [ ] **Step 4: Type-check and run the full suite**

```bash
pnpm typecheck && pnpm test
```

Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
git add services/media/repository.ts services/media/index.ts "app/api/media/[assetId]/[version]/[variant]/route.ts"
git commit -m "feat(website): serve media to guests viewing a published invitation"
```

---

### Task 6: `features/website-generator/repository.ts` — Prisma reads/writes

**Files:**
- Create: `features/website-generator/repository.ts`

No test file — Prisma-backed, matching every repository in this codebase
(`features/invitation-builder/repository.ts`, `services/media/repository.ts`).
Verified manually via `pnpm db:local` in the final task.

**Interfaces:**
- Consumes: `prisma`, `isDatabaseConfigured` (`@/lib/db`), `logger` (`@/lib/logger`) —
  existing.
- Produces: `getPublishedInvitation(slug)`, `PublicInvitation` type,
  `getInvitationForManage(profileId, invitationId)`, `isSlugAvailable(slug,
  excludingInvitationId?)`, `publishInvitation(profileId, invitationId, slug)`,
  `unpublishInvitation(profileId, invitationId)`, `RsvpInput`, `createRsvp(invitationId,
  input)`, `invitationAcceptsRsvps(invitationId)`, `listRsvps(profileId,
  invitationId)` — Task 9 (public page), Task 10 (RSVP action), Task 11 (RSVP
  dashboard view), and Task 12 (publish control) all consume this.

- [ ] **Step 1: Write `features/website-generator/repository.ts`**

```typescript
import "server-only";

import type { Prisma } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { logger } from "@/lib/logger";

/**
 * Website-generator reads/writes — Ph5.md. The only module that queries the
 * public-website concerns of Invitation (slug, isPublished) and RsvpResponse.
 * Mirrors features/invitation-builder/repository.ts's shape: every write
 * proves ownership in the WHERE clause; the one read with no owner to check
 * (the public page itself) scopes on isPublished instead.
 */

const PUBLIC_INCLUDE = {
  template: { select: { id: true, name: true } },
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

export type PublicInvitation = Prisma.InvitationGetPayload<{
  include: typeof PUBLIC_INCLUDE;
}>;

/**
 * The published site's data, by its public slug. Null for a draft, an
 * unpublished site, or a slug nobody owns — the caller (the public route)
 * can't distinguish which, and must not: a `DRAFT` must be exactly as
 * unreachable as a slug that was never claimed.
 */
export async function getPublishedInvitation(
  slug: string,
): Promise<PublicInvitation | null> {
  if (!isDatabaseConfigured()) return null;

  try {
    return await prisma.invitation.findFirst({
      where: { slug, isPublished: true },
      include: PUBLIC_INCLUDE,
    });
  } catch (error) {
    logger.report(error, { at: "getPublishedInvitation", slug });
    return null;
  }
}

/** One invitation, for its owner, with just the fields the publish-control page needs. */
export async function getInvitationForManage(
  profileId: string,
  invitationId: string,
) {
  if (!isDatabaseConfigured()) return null;

  try {
    return await prisma.invitation.findFirst({
      where: { id: invitationId, profileId },
      select: {
        id: true,
        title: true,
        status: true,
        slug: true,
        isPublished: true,
      },
    });
  } catch (error) {
    logger.report(error, { at: "getInvitationForManage", invitationId });
    return null;
  }
}

/** `excludingInvitationId` lets an invitation "conflict" with its own current slug when re-saving without changing it. */
export async function isSlugAvailable(
  slug: string,
  excludingInvitationId?: string,
): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  try {
    const existing = await prisma.invitation.findUnique({
      where: { slug },
      select: { id: true },
    });
    if (!existing) return true;
    return existing.id === excludingInvitationId;
  } catch (error) {
    logger.report(error, { at: "isSlugAvailable", slug });
    return false;
  }
}

export type PublishResult = { ok: true } | { ok: false; error: string };

/**
 * Publishing requires COMPLETED status and an available slug — both re-checked
 * here, not just in the UI that hides the button otherwise (design doc's
 * explicit constraint: this is the actual gate, not a courtesy).
 */
export async function publishInvitation(
  profileId: string,
  invitationId: string,
  slug: string,
): Promise<PublishResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Not available on this deployment." };
  }

  try {
    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, profileId },
      select: { status: true },
    });
    if (!invitation) return { ok: false, error: "That invitation no longer exists." };
    if (invitation.status !== "COMPLETED") {
      return { ok: false, error: "Finish the invitation before publishing it." };
    }

    const available = await isSlugAvailable(slug, invitationId);
    if (!available) return { ok: false, error: "That web address is already taken." };

    await prisma.invitation.update({
      where: { id: invitationId },
      data: { slug, isPublished: true },
    });
    return { ok: true };
  } catch (error) {
    logger.report(error, { at: "publishInvitation", invitationId });
    return { ok: false, error: "Could not publish. Please try again." };
  }
}

/** The slug is kept, not cleared — republishing later reuses the same URL and any already-printed QR code. */
export async function unpublishInvitation(
  profileId: string,
  invitationId: string,
): Promise<PublishResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Not available on this deployment." };
  }

  try {
    const found = await prisma.invitation.findFirst({
      where: { id: invitationId, profileId },
      select: { id: true },
    });
    if (!found) return { ok: false, error: "That invitation no longer exists." };

    await prisma.invitation.update({
      where: { id: invitationId },
      data: { isPublished: false },
    });
    return { ok: true };
  } catch (error) {
    logger.report(error, { at: "unpublishInvitation", invitationId });
    return { ok: false, error: "Could not unpublish. Please try again." };
  }
}

export interface RsvpInput {
  guestName: string;
  attending: boolean;
  guestCount: number;
  message: string | null;
}

export type CreateRsvpResult = { ok: true } | { ok: false; error: string };

/** Stores a guest's response. The caller (Task 10's Server Action) has already confirmed the invitation is published. */
export async function createRsvp(
  invitationId: string,
  input: RsvpInput,
): Promise<CreateRsvpResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, error: "Not available on this deployment." };
  }

  try {
    await prisma.rsvpResponse.create({
      data: {
        invitationId,
        guestName: input.guestName,
        attending: input.attending,
        guestCount: input.guestCount,
        message: input.message,
      },
    });
    return { ok: true };
  } catch (error) {
    logger.report(error, { at: "createRsvp", invitationId });
    return {
      ok: false,
      error: "Could not save your response. Please try again.",
    };
  }
}

/** True when the invitation exists and is published — the gate submitRsvp checks before writing. */
export async function invitationAcceptsRsvps(
  invitationId: string,
): Promise<boolean> {
  if (!isDatabaseConfigured()) return false;

  try {
    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, isPublished: true },
      select: { id: true },
    });
    return invitation !== null;
  } catch (error) {
    logger.report(error, { at: "invitationAcceptsRsvps", invitationId });
    return false;
  }
}

export async function listRsvps(profileId: string, invitationId: string) {
  if (!isDatabaseConfigured()) return [];

  try {
    // Scoped through the invitation's own owner check — an RSVP row has no
    // profileId of its own, so ownership is proven via this join, not a
    // column on rsvp_responses.
    const invitation = await prisma.invitation.findFirst({
      where: { id: invitationId, profileId },
      select: { id: true },
    });
    if (!invitation) return [];

    return await prisma.rsvpResponse.findMany({
      where: { invitationId },
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    logger.report(error, { at: "listRsvps", invitationId });
    return [];
  }
}
```

- [ ] **Step 2: Type-check**

```bash
pnpm typecheck
```

Expected: exits 0. (If `Invitation.slug`/`isPublished` or `RsvpResponse` aren't yet
typed, re-run `pnpm prisma:generate` from Task 1 Step 6.)

- [ ] **Step 3: Commit**

```bash
git add features/website-generator/repository.ts
git commit -m "feat(website): add Prisma repository for publish, RSVP, and public reads"
```

---

### Task 7: `features/website-generator/countdown-time.ts` — target instant + time remaining

**Files:**
- Create: `features/website-generator/countdown-time.ts`
- Test: `features/website-generator/countdown-time.test.ts`

`Invitation.eventDate` is a calendar day at UTC midnight — Ph3 never combines it with
`eventTime` except at display time (`preview-model.ts`'s `formatTime`). A countdown to
`eventDate` alone would count down to midnight, not to the ceremony's real start time.
This module computes the actual target instant first, then counts down to it.

**Interfaces:**
- Consumes: nothing (pure).
- Produces: `zonedInstant(calendarDate, wallClockTime, timeZone)`, `timeRemaining(target,
  now?)`, `TimeRemaining` — Task 9's `<Countdown>` component consumes both.

- [ ] **Step 1: Write the failing test**

Create `features/website-generator/countdown-time.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { zonedInstant, timeRemaining } from "./countdown-time";

describe("zonedInstant", () => {
  it("converts a wall-clock date+time in a zone to the correct UTC instant", () => {
    // 3pm in Manila (UTC+8, no DST) is 7am UTC the same day.
    const result = zonedInstant(
      new Date("2027-03-14T00:00:00.000Z"),
      "15:00",
      "Asia/Manila",
    );
    expect(result.toISOString()).toBe("2027-03-14T07:00:00.000Z");
  });

  it("defaults to midnight when no wall-clock time is set", () => {
    const result = zonedInstant(
      new Date("2027-03-14T00:00:00.000Z"),
      null,
      "Asia/Manila",
    );
    // Midnight in Manila is 4pm UTC the previous day.
    expect(result.toISOString()).toBe("2027-03-13T16:00:00.000Z");
  });

  it("falls back rather than throwing on a bad zone", () => {
    expect(() =>
      zonedInstant(new Date("2027-03-14T00:00:00.000Z"), "15:00", "Not/AZone"),
    ).not.toThrow();
  });
});

describe("timeRemaining", () => {
  it("breaks down days, hours, minutes, seconds for a future target", () => {
    const now = new Date("2027-01-01T00:00:00.000Z");
    // 1 day, 1 hour, 1 minute, 1 second ahead.
    const target = new Date(now.getTime() + ((24 + 1) * 3600 + 61) * 1000);
    const result = timeRemaining(target, now);
    expect(result).toEqual({
      days: 1,
      hours: 1,
      minutes: 1,
      seconds: 1,
      isPast: false,
    });
  });

  it("reports isPast for a target already passed", () => {
    const now = new Date("2027-01-01T00:00:00.000Z");
    const target = new Date("2026-12-31T00:00:00.000Z");
    expect(timeRemaining(target, now).isPast).toBe(true);
  });

  it("reports isPast at the exact instant, not one second before", () => {
    const now = new Date("2027-01-01T00:00:00.000Z");
    expect(timeRemaining(new Date(now), now).isPast).toBe(true);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
pnpm test:watch --run features/website-generator/countdown-time.test.ts
```

Expected: FAIL — `Cannot find module './countdown-time'`.

- [ ] **Step 3: Write `features/website-generator/countdown-time.ts`**

```typescript
/**
 * Countdown time — Ph5.md §4. Two pure pieces: converting the event's
 * wall-clock date+time+zone into a real UTC instant, and counting down to it.
 */

/**
 * The UTC instant a wall-clock date+time means in a given IANA zone, using
 * only `Intl` (no date library): format a guess, measure how far Intl's
 * rendering of it drifted from the wall-clock we asked for, and correct by
 * that drift. The same problem `preview-model.ts`'s formatDate/formatTime
 * solve for *display*, in reverse — computing an instant rather than
 * formatting one.
 */
export function zonedInstant(
  calendarDate: Date,
  wallClockTime: string | null,
  timeZone: string,
): Date {
  const [hoursRaw, minutesRaw] = (wallClockTime ?? "00:00")
    .split(":")
    .map(Number);
  const hours = hoursRaw || 0;
  const minutes = minutesRaw || 0;

  const year = calendarDate.getUTCFullYear();
  const month = calendarDate.getUTCMonth();
  const day = calendarDate.getUTCDate();
  const guessUtc = Date.UTC(year, month, day, hours, minutes);

  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).formatToParts(new Date(guessUtc));

    const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    const renderedAsUtc = Date.UTC(
      Number(map.year),
      Number(map.month) - 1,
      Number(map.day),
      Number(map.hour),
      Number(map.minute),
      Number(map.second),
    );

    return new Date(guessUtc - (renderedAsUtc - guessUtc));
  } catch {
    // A bad zone must not crash the countdown — same graceful-fallback
    // posture as preview-model.ts's formatDate.
    return new Date(guessUtc);
  }
}

export interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isPast: boolean;
}

/** Pure — the component supplies real `Date.now()`; tests supply a fixed one. */
export function timeRemaining(
  target: Date,
  now: Date = new Date(),
): TimeRemaining {
  const diffMs = target.getTime() - now.getTime();
  if (diffMs <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true };
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    isPast: false,
  };
}
```

- [ ] **Step 4: Run the test again and confirm it passes**

```bash
pnpm test:watch --run features/website-generator/countdown-time.test.ts
```

Expected: PASS — 6 tests.

- [ ] **Step 5: Commit**

```bash
git add features/website-generator/countdown-time.ts features/website-generator/countdown-time.test.ts
git commit -m "feat(website): compute countdown target instant and time remaining"
```

---

### Task 8: QR code generation

**Files:**
- Create: `lib/qr.ts`
- Create: `app/api/qr/[slug]/route.ts`
- Modify: `package.json` (add `qrcode` + `@types/qrcode`)

No test file for either — `lib/qr.ts` is a two-line wrapper over a third-party
encoder (nothing of ours to unit-test), and the route needs a real published
invitation to exercise meaningfully (verified manually in the final task).

**Interfaces:**
- Consumes: `getPublishedInvitation` (Task 6), `routes.publicEvent` (Task 2), `env.app.url`
  (existing, `lib/env.ts`).
- Produces: `generateQrPng(text)`; `GET /api/qr/[slug]` — a PNG image, or 404 if the
  slug isn't currently published.

- [ ] **Step 1: Add the dependency**

```bash
pnpm add qrcode
pnpm add -D @types/qrcode
```

Expected: `package.json` gains `"qrcode": "^1.5.4"` (or whatever resolves) under
`"dependencies"` — it's used at runtime by the route, not just in tests — and
`"@types/qrcode"` under `"devDependencies"` (the package ships no types of its own).

- [ ] **Step 2: Write `lib/qr.ts`**

```typescript
import QRCode from "qrcode";

/**
 * QR code generation — Ph5.md §5 (Deliverable 7). A thin wrapper over the
 * `qrcode` package (MIT-licensed, free, no network call, no paid service) so
 * the route handler doesn't reach for a third-party encoder directly.
 */
export async function generateQrPng(text: string): Promise<Buffer> {
  return QRCode.toBuffer(text, {
    type: "png",
    width: 512,
    margin: 2,
  });
}
```

- [ ] **Step 3: Write `app/api/qr/[slug]/route.ts`**

```typescript
import { type NextRequest } from "next/server";
import { getPublishedInvitation } from "@/features/website-generator/repository";
import { generateQrPng } from "@/lib/qr";
import { routes } from "@/lib/config";
import { env } from "@/lib/env";

/**
 * QR code for a published site — Ph5.md §5. A pure function of the slug's
 * public URL, the same "deterministic image, cacheable" shape as
 * app/api/placeholder/[surface]/[seed]/route.ts, but gated on the invitation
 * actually being published: an unpublished slug gets no QR code, matching
 * every other guest-facing surface this phase adds. No session required —
 * the image encodes a URL that is itself public once published, nothing
 * about the QR code reveals anything a guest couldn't already reach.
 */
export const runtime = "nodejs";

export async function GET(
  _request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const invitation = await getPublishedInvitation(params.slug);
  if (!invitation) return new Response("Not found", { status: 404 });

  const url = `${env.app.url}${routes.publicEvent(params.slug)}`;
  const png = await generateQrPng(url);

  return new Response(png, {
    headers: {
      "Content-Type": "image/png",
      // Immutable is safe: the slug is stable once published (design doc
      // Decision 1), so the encoded URL never changes without a new slug.
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
```

- [ ] **Step 4: Type-check**

```bash
pnpm typecheck
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml lib/qr.ts "app/api/qr/[slug]/route.ts"
git commit -m "feat(website): generate a QR code image for a published site"
```

---

### Task 9: Public page and rendering

**Files:**
- Create: `features/website-generator/components/countdown.tsx`
- Create: `features/website-generator/components/event-site.tsx`
- Create: `app/e/[slug]/page.tsx`

No test file — Client/Server Components, matching this codebase's convention (Ph3's
own `InvitationPreview`/`PreviewPane` have none either). Verified manually in the
final task.

`event-site.tsx` deliberately mirrors `features/invitation-builder/preview/
invitation-preview.tsx`'s section structure and `shows(model, slug, hasContent)` calls
— same section slugs, same visibility rule — so "hidden sections stay hidden"
(design doc's Rendering Fidelity deliverable) holds by construction, not by
coincidence. It does **not** import `InvitationPreview` itself (that file lives inside
`features/invitation-builder`, and importing it would be the same cross-feature
import Task 3 already resolved by relocating `preview-model.ts`) — it's a new,
full-page component that happens to follow the same pattern. It adds a maps link
(the in-app preview never needed one) and an uncapped gallery (the preview caps at
six thumbnails; a real site shows all of them). It does **not** yet include RSVP
submission — Task 10 adds that.

**Interfaces:**
- Consumes: `getPublishedInvitation`, `PublicInvitation` (Task 6); `toPreviewModel`,
  `PreviewInput`, `PreviewModel`, `shows` (Task 3, `@/lib/invitation/preview-model`);
  `zonedInstant`, `timeRemaining` (Task 7); `thumbnailUrl`, `previewUrl` (existing,
  `@/services/media`); `features.websiteGenerator` (Task 2).
- Produces: `<Countdown targetDate>`, `<EventSite invitationId model countdownTarget>`,
  the `app/e/[slug]` route with `generateMetadata`.

- [ ] **Step 1: Write `features/website-generator/components/countdown.tsx`**

```typescript
"use client";

import * as React from "react";
import { timeRemaining } from "../countdown-time";

/**
 * Live countdown — Ph5.md §4. Computed client-side against the visitor's own
 * clock; a server-rendered countdown is stale the instant it's rendered.
 * Takes the already-resolved target instant (Task 7's zonedInstant) as a
 * prop, computed once by the page — see the design doc's Decision 5 carve-out
 * on why this bypasses PreviewModel rather than widening its contract.
 */
export function Countdown({ targetDate }: { targetDate: Date }) {
  const [remaining, setRemaining] = React.useState(() =>
    timeRemaining(targetDate),
  );

  React.useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(timeRemaining(targetDate));
    }, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  if (remaining.isPast) return null;

  const units: [string, number][] = [
    ["Days", remaining.days],
    ["Hours", remaining.hours],
    ["Minutes", remaining.minutes],
    ["Seconds", remaining.seconds],
  ];

  return (
    <div
      role="timer"
      aria-live="off"
      className="flex justify-center gap-4 text-center sm:gap-6"
    >
      {units.map(([label, value]) => (
        <div key={label}>
          <div className="text-2xl font-semibold tabular-nums sm:text-3xl">
            {value}
          </div>
          <div className="text-[10px] uppercase tracking-widest opacity-60">
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write `features/website-generator/components/event-site.tsx`**

```typescript
import type { PreviewModel } from "@/lib/invitation/preview-model";
import { shows } from "@/lib/invitation/preview-model";
import { Countdown } from "./countdown";

/**
 * The public website's render — Ph5.md. Mirrors
 * features/invitation-builder/preview/invitation-preview.tsx's section
 * structure and shows() calls so section visibility matches the in-app
 * preview exactly, but as a full standalone page: bigger type, a maps link
 * per venue, and an uncapped gallery. RSVP submission is added in Task 10.
 */

function Section({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto mt-10 max-w-xl px-4 first:mt-0">
      {title ? (
        <h2 className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.2em] opacity-70">
          {title}
        </h2>
      ) : null}
      {children}
    </section>
  );
}

export function EventSite({
  model,
  countdownTarget,
}: {
  invitationId: string;
  model: PreviewModel;
  countdownTarget: Date | null;
}) {
  const { style } = model;

  const background =
    style.backgroundStyle === "soft-gradient"
      ? `linear-gradient(160deg, ${style.background} 0%, ${style.accent}22 100%)`
      : style.background;

  return (
    <div
      className="min-h-screen pb-16"
      style={{ background, color: style.foreground, fontFamily: style.bodyFont }}
    >
      {model.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={model.coverImageUrl}
          alt=""
          className="h-64 w-full object-cover sm:h-96"
        />
      ) : null}

      <header className="mx-auto mt-10 max-w-xl px-4 text-center">
        {shows(model, "welcome", Boolean(model.welcomeMessage)) ? (
          <p className="mb-4 text-sm italic opacity-80">
            {model.welcomeMessage}
          </p>
        ) : null}

        <h1
          className="text-4xl leading-tight sm:text-5xl"
          style={{ fontFamily: style.headingFont }}
        >
          {model.title}
        </h1>
        {model.subtitle ? (
          <p className="mt-2 opacity-75">{model.subtitle}</p>
        ) : null}

        {model.dateLine ? (
          <p
            className="mt-6 text-sm font-medium"
            style={{ color: style.accent }}
          >
            {model.dateLine}
            {model.timeLine ? ` · ${model.timeLine}` : ""}
          </p>
        ) : null}
      </header>

      {countdownTarget ? (
        <Section>
          <Countdown targetDate={countdownTarget} />
        </Section>
      ) : null}

      {shows(model, "hosts", model.hosts.length > 0) ? (
        <Section>
          <p
            className="text-center text-xl"
            style={{ fontFamily: style.headingFont }}
          >
            {model.hosts.map((host) => host.name).join("  ·  ")}
          </p>
        </Section>
      ) : null}

      {model.invitationMessage ? (
        <Section>
          <p className="whitespace-pre-line text-center leading-relaxed opacity-90">
            {model.invitationMessage}
          </p>
        </Section>
      ) : null}

      {shows(model, "parents", model.parents.length > 0) ? (
        <Section title="Parents">
          <ul className="space-y-1 text-center">
            {model.parents.map((person) => (
              <li key={person.id}>
                {person.name}
                {person.role ? (
                  <span className="opacity-60"> — {person.role}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {shows(model, "sponsors", model.sponsors.length > 0) ? (
        <Section title="Principal Sponsors">
          <ul className="grid grid-cols-2 gap-x-6 gap-y-1 text-center">
            {model.sponsors.map((person) => (
              <li key={person.id}>{person.name}</li>
            ))}
          </ul>
        </Section>
      ) : null}

      {shows(model, "venues", model.venues.length > 0) ? (
        <Section title="Where">
          <div className="space-y-6">
            {model.venues.map((venue) => (
              <div key={venue.id} className="text-center">
                <p className="text-[10px] uppercase tracking-widest opacity-60">
                  {venue.label}
                  {venue.timeLine ? ` · ${venue.timeLine}` : ""}
                </p>
                <p className="font-medium">{venue.name}</p>
                {venue.address ? (
                  <p className="text-sm opacity-70">{venue.address}</p>
                ) : null}
                {venue.mapsUrl ? (
                  <a
                    href={venue.mapsUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="mt-1 inline-block text-sm underline"
                    style={{ color: style.accent }}
                  >
                    View on Google Maps
                  </a>
                ) : null}
                {venue.parkingNotes ? (
                  <p className="mt-1 text-xs opacity-60">
                    {venue.parkingNotes}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {shows(model, "program", model.program.length > 0) ? (
        <Section title="Programme">
          <ul className="mx-auto max-w-sm space-y-2">
            {model.program.map((item) => (
              <li key={item.id} className="flex gap-4">
                <span className="w-16 shrink-0 text-right text-sm opacity-60">
                  {item.time ?? ""}
                </span>
                <span>
                  {item.title}
                  {item.description ? (
                    <span className="block text-sm opacity-60">
                      {item.description}
                    </span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {shows(model, "gallery", model.galleryUrls.length > 0) ? (
        <Section>
          <div className="mx-auto grid max-w-2xl grid-cols-2 gap-2 px-4 sm:grid-cols-3">
            {model.galleryUrls.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt=""
                className="aspect-square w-full rounded object-cover"
              />
            ))}
          </div>
        </Section>
      ) : null}

      {shows(model, "dress-code", Boolean(model.dressCode)) ? (
        <Section title="Dress code">
          <p className="text-center">{model.dressCode}</p>
        </Section>
      ) : null}

      {shows(model, "gifts", Boolean(model.giftsPreference)) ? (
        <Section title="Gifts">
          <p className="whitespace-pre-line text-center opacity-90">
            {model.giftsPreference}
          </p>
        </Section>
      ) : null}

      {shows(model, "notes", Boolean(model.specialNotes)) ? (
        <Section title="Notes">
          <p className="whitespace-pre-line text-center opacity-90">
            {model.specialNotes}
          </p>
        </Section>
      ) : null}

      {shows(model, "rsvp", Boolean(model.rsvpLine)) ? (
        <Section>
          <p
            className="text-center text-sm font-medium"
            style={{ color: style.accent }}
          >
            {model.rsvpLine}
          </p>
        </Section>
      ) : null}

      {model.closingMessage ? (
        <Section>
          <p className="text-center italic opacity-80">
            {model.closingMessage}
          </p>
        </Section>
      ) : null}
    </div>
  );
}
```

- [ ] **Step 3: Write `app/e/[slug]/page.tsx`**

```typescript
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedInvitation } from "@/features/website-generator/repository";
import { zonedInstant } from "@/features/website-generator/countdown-time";
import { EventSite } from "@/features/website-generator/components/event-site";
import { toPreviewModel, type PreviewInput } from "@/lib/invitation/preview-model";
import { previewUrl } from "@/services/media";
import { features } from "@/lib/config";

export const dynamic = "force-dynamic";

/**
 * The public event website — Ph5.md. No auth: guests have no ML-DEP account.
 * A DRAFT invitation, or one that is not currently published, is
 * indistinguishable from a slug nobody ever claimed — both 404, and neither
 * reaches generateMetadata, so nothing unpublished is ever indexable.
 */
export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  if (!features.websiteGenerator) return {};

  const invitation = await getPublishedInvitation(params.slug);
  if (!invitation) return {};

  const title = invitation.eventTitle?.trim() || invitation.title;
  const cover = invitation.media.find((link) => link.slot === "COVER");

  return {
    title,
    description: invitation.subtitle ?? `You're invited — ${title}`,
    openGraph: cover
      ? { title, images: [{ url: previewUrl(cover.asset) }] }
      : { title },
    robots: { index: false, follow: false },
  };
}

export default async function PublicEventPage({
  params,
}: {
  params: { slug: string };
}) {
  if (!features.websiteGenerator) notFound();

  const invitation = await getPublishedInvitation(params.slug);
  if (!invitation) notFound();

  const mediaUrls: Partial<
    Record<"COVER" | "COUPLE" | "FAMILY" | "LOGO", string[]>
  > = {};
  for (const link of invitation.media) {
    if (link.slot === "MUSIC") continue;
    const slot = link.slot as "COVER" | "COUPLE" | "FAMILY" | "LOGO";
    (mediaUrls[slot] ??= []).push(previewUrl(link.asset));
  }

  const input: PreviewInput = {
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
    mediaUrls,
  };

  const model = toPreviewModel(input);

  const countdownTarget = invitation.eventDate
    ? zonedInstant(invitation.eventDate, invitation.eventTime, invitation.timeZone)
    : null;

  return (
    <EventSite
      invitationId={invitation.id}
      model={model}
      countdownTarget={countdownTarget}
    />
  );
}
```

- [ ] **Step 4: Type-check and run the full suite**

```bash
pnpm typecheck && pnpm test
```

Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
git add features/website-generator/components/countdown.tsx features/website-generator/components/event-site.tsx "app/e/[slug]/page.tsx"
git commit -m "feat(website): render the public event website"
```

---

### Task 10: RSVP submission

**Files:**
- Create: `features/website-generator/actions.ts`
- Create: `features/website-generator/components/rsvp-form.tsx`
- Modify: `features/website-generator/components/event-site.tsx` (the "rsvp" section)

No test file for the action or form component — intentionally unauthenticated Server
Action + Client Component, matching every other Server Action/form pair in this
codebase (none are unit-tested; verified manually in the final task). The
`rsvpSchema` validation itself runs through `safeParse`, the same library
(`zod`) already used throughout this codebase's Server Actions — no new testing
pattern introduced.

**Interfaces:**
- Consumes: `createRsvp`, `invitationAcceptsRsvps` (Task 6).
- Produces: `submitRsvp(prev, formData)`, `RsvpFormState`; `<RsvpForm invitationId
  accentColor>` — Task 9's `event-site.tsx` (this task modifies its RSVP section) is
  the only consumer.

- [ ] **Step 1: Write `features/website-generator/actions.ts`**

```typescript
"use server";

import { z } from "zod";
import { createRsvp, invitationAcceptsRsvps } from "./repository";

/**
 * RSVP submission — Ph5.md §3. Intentionally unauthenticated: guests have no
 * ML-DEP account. Validates at the boundary — the same "gate, not a scanner"
 * posture as services/upload/validation.ts — before ever reaching the
 * database. No rate limiting or spam protection (design doc's stated,
 * deliberate gap, not an oversight).
 */

const rsvpSchema = z.object({
  guestName: z.string().trim().min(1, "Please enter your name.").max(120),
  attending: z.enum(["yes", "no"]),
  guestCount: z.coerce.number().int().min(1).max(10),
  message: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((v) => v || undefined),
});

export interface RsvpFormState {
  error?: string;
  success?: boolean;
}

export async function submitRsvp(
  _prev: RsvpFormState,
  formData: FormData,
): Promise<RsvpFormState> {
  const invitationId = String(formData.get("invitationId") ?? "");

  const accepts = await invitationAcceptsRsvps(invitationId);
  if (!accepts) {
    return { error: "This invitation is not accepting responses." };
  }

  const parsed = rsvpSchema.safeParse({
    guestName: formData.get("guestName"),
    attending: formData.get("attending"),
    guestCount: formData.get("guestCount") ?? "1",
    message: formData.get("message") ?? undefined,
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please check your response.",
    };
  }

  const result = await createRsvp(invitationId, {
    guestName: parsed.data.guestName,
    attending: parsed.data.attending === "yes",
    guestCount: parsed.data.guestCount,
    message: parsed.data.message ?? null,
  });

  if (!result.ok) return { error: result.error };

  return { success: true };
}
```

- [ ] **Step 2: Write `features/website-generator/components/rsvp-form.tsx`**

```typescript
"use client";

import { useFormState } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { submitRsvp, type RsvpFormState } from "../actions";

const initialState: RsvpFormState = {};

/**
 * The guest-facing RSVP form — Ph5.md §3. Submits once; there is no
 * edit-after-submit (design doc Decision 3) — a second submission is a
 * second row, not an update, and this form does not attempt to prevent one.
 */
export function RsvpForm({
  invitationId,
  accentColor,
}: {
  invitationId: string;
  accentColor: string;
}) {
  const [state, formAction] = useFormState(submitRsvp, initialState);

  if (state.success) {
    return (
      <p
        className="text-center text-sm font-medium"
        style={{ color: accentColor }}
      >
        Thank you — your response has been recorded.
      </p>
    );
  }

  return (
    <form action={formAction} className="mx-auto max-w-sm space-y-3">
      <input type="hidden" name="invitationId" value={invitationId} />

      <div>
        <label htmlFor="guestName" className="sr-only">
          Your name
        </label>
        <Input
          id="guestName"
          name="guestName"
          placeholder="Your name"
          required
          maxLength={120}
        />
      </div>

      <div className="flex justify-center gap-4 text-sm">
        <label className="flex items-center gap-1.5">
          <input type="radio" name="attending" value="yes" defaultChecked required />
          Joyfully accepts
        </label>
        <label className="flex items-center gap-1.5">
          <input type="radio" name="attending" value="no" />
          Regretfully declines
        </label>
      </div>

      <div>
        <label htmlFor="guestCount" className="sr-only">
          Number of guests
        </label>
        <Input
          id="guestCount"
          name="guestCount"
          type="number"
          min={1}
          max={10}
          defaultValue={1}
        />
      </div>

      <div>
        <label htmlFor="message" className="sr-only">
          Message
        </label>
        <Input
          id="message"
          name="message"
          placeholder="A message for the hosts (optional)"
          maxLength={500}
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-center text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" className="w-full">
        Send response
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Wire the form into `event-site.tsx`**

Change the import line from:

```typescript
import type { PreviewModel } from "@/lib/invitation/preview-model";
import { shows } from "@/lib/invitation/preview-model";
import { Countdown } from "./countdown";
```

to:

```typescript
import type { PreviewModel } from "@/lib/invitation/preview-model";
import { shows } from "@/lib/invitation/preview-model";
import { Countdown } from "./countdown";
import { RsvpForm } from "./rsvp-form";
```

Then change the RSVP section from:

```typescript
      {shows(model, "rsvp", Boolean(model.rsvpLine)) ? (
        <Section>
          <p
            className="text-center text-sm font-medium"
            style={{ color: style.accent }}
          >
            {model.rsvpLine}
          </p>
        </Section>
      ) : null}
```

to:

```typescript
      {shows(model, "rsvp", true) ? (
        // Unlike the in-app preview (which only shows a deadline sentence),
        // the public site always shows the form when the section isn't
        // switched off — a way to respond is useful even with no stated
        // deadline, so "has content" is the form itself, not model.rsvpLine.
        <Section title="RSVP">
          {model.rsvpLine ? (
            <p
              className="mb-4 text-center text-sm font-medium"
              style={{ color: style.accent }}
            >
              {model.rsvpLine}
            </p>
          ) : null}
          <RsvpForm invitationId={invitationId} accentColor={style.accent} />
        </Section>
      ) : null}
```

(`invitationId` is already an accepted prop of `EventSite` from Task 9 — this is the
first place it's actually used inside the component.)

- [ ] **Step 4: Type-check and run the full suite**

```bash
pnpm typecheck && pnpm test
```

Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
git add features/website-generator/actions.ts features/website-generator/components/rsvp-form.tsx features/website-generator/components/event-site.tsx
git commit -m "feat(website): add guest RSVP submission"
```

---

### Task 11: RSVP dashboard view

**Files:**
- Create: `app/(dashboard)/dashboard/events/[id]/rsvps/page.tsx`

No test file — data-fetching Server Component page, matching every other dashboard
page in this codebase.

**Interfaces:**
- Consumes: `getInvitationForManage`, `listRsvps` (Task 6); `getProfile` (existing);
  `routes.dashboard.eventRsvps`, `features.websiteGenerator` (Task 2).

- [ ] **Step 1: Write `app/(dashboard)/dashboard/events/[id]/rsvps/page.tsx`**

```typescript
import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { Users } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getProfile } from "@/lib/auth/session";
import { routes, features } from "@/lib/config";
import {
  getInvitationForManage,
  listRsvps,
} from "@/features/website-generator/repository";

export const metadata: Metadata = { title: "RSVPs" };

export const dynamic = "force-dynamic";

/**
 * RSVP list — Ph5.md §3. The first "manage a completed invitation" surface
 * in this project; Phase 3's "My Events" only ever reopens a draft into the
 * builder.
 */
export default async function EventRsvpsPage({
  params,
}: {
  params: { id: string };
}) {
  if (!features.websiteGenerator) notFound();

  const profile = await getProfile();
  if (!profile) redirect(routes.login);

  const invitation = await getInvitationForManage(profile.id, params.id);
  if (!invitation) notFound();

  const rsvps = await listRsvps(profile.id, params.id);
  const attendingCount = rsvps
    .filter((rsvp) => rsvp.attending)
    .reduce((sum, rsvp) => sum + rsvp.guestCount, 0);

  return (
    <>
      <PageHeader
        title="RSVPs"
        description={`Responses for "${invitation.title}".`}
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard.root },
          { label: "My Events", href: routes.dashboard.events },
          { label: "RSVPs" },
        ]}
      />

      {rsvps.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="No responses yet"
          description="Responses show up here once your website is published and guests start replying."
        />
      ) : (
        <>
          <p className="mb-4 text-sm text-muted-foreground">
            {attendingCount} guest{attendingCount === 1 ? "" : "s"} attending,
            across {rsvps.length} response{rsvps.length === 1 ? "" : "s"}.
          </p>
          <div className="space-y-2">
            {rsvps.map((rsvp) => (
              <div
                key={rsvp.id}
                className="rounded-lg border border-border p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">{rsvp.guestName}</p>
                  <span
                    className={
                      rsvp.attending
                        ? "text-xs text-success"
                        : "text-xs text-muted-foreground"
                    }
                  >
                    {rsvp.attending
                      ? `Attending · ${rsvp.guestCount}`
                      : "Not attending"}
                  </span>
                </div>
                {rsvp.message ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {rsvp.message}
                  </p>
                ) : null}
                <p className="mt-1 text-xs text-muted-foreground">
                  {rsvp.createdAt.toLocaleDateString("en-PH", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </>
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
git add "app/(dashboard)/dashboard/events/[id]/rsvps/page.tsx"
git commit -m "feat(website): add RSVP dashboard view"
```

---

### Task 12: Publish control

**Files:**
- Modify: `features/website-generator/actions.ts` (add `publishAction`, `unpublishAction`)
- Create: `features/website-generator/components/publish-form.tsx`
- Create: `app/(dashboard)/dashboard/events/[id]/website/page.tsx`

No test file for the actions/component — same convention as Task 10. Verified
manually in the final task.

**Interfaces:**
- Consumes: `publishInvitation`, `unpublishInvitation`, `getInvitationForManage`
  (Task 6); `normalizeSlug`, `validateSlug` (Task 4); `getProfile` (existing);
  `routes.dashboard.eventWebsite`, `routes.publicEvent` (Task 2); `env.app.url`
  (existing, `lib/env.ts`).
- Produces: `publishAction`, `unpublishAction`, `PublishFormState`; `<PublishForm
  invitationId currentSlug isPublished publicUrl>`.

- [ ] **Step 1: Add publish/unpublish actions to `features/website-generator/actions.ts`**

Add these imports to the top of the existing file (alongside the `z`/`createRsvp`/
`invitationAcceptsRsvps` imports from Task 10):

```typescript
import { revalidatePath } from "next/cache";
import { getProfile } from "@/lib/auth/session";
import { routes } from "@/lib/config";
import { normalizeSlug, validateSlug } from "./slug";
import { publishInvitation, unpublishInvitation } from "./repository";
```

Then append:

```typescript
export interface PublishFormState {
  error?: string;
}

/**
 * Publish — design doc Decision 2's constraint re-checked here, not just in
 * the UI: COMPLETED status and slug validity/availability are enforced by
 * `publishInvitation` itself (Task 6), this action only shapes the form
 * input into what that function expects.
 */
export async function publishAction(
  _prev: PublishFormState,
  formData: FormData,
): Promise<PublishFormState> {
  const profile = await getProfile();
  if (!profile) return { error: "Please sign in again." };

  const invitationId = String(formData.get("invitationId") ?? "");
  const slug = normalizeSlug(String(formData.get("slug") ?? ""));

  const failure = validateSlug(slug);
  if (failure) return { error: failure.message };

  const result = await publishInvitation(profile.id, invitationId, slug);
  if (!result.ok) return { error: result.error };

  revalidatePath(routes.dashboard.eventWebsite(invitationId));
  revalidatePath(routes.dashboard.events);
  return {};
}

export async function unpublishAction(
  _prev: PublishFormState,
  formData: FormData,
): Promise<PublishFormState> {
  const profile = await getProfile();
  if (!profile) return { error: "Please sign in again." };

  const invitationId = String(formData.get("invitationId") ?? "");
  const result = await unpublishInvitation(profile.id, invitationId);
  if (!result.ok) return { error: result.error };

  revalidatePath(routes.dashboard.eventWebsite(invitationId));
  return {};
}
```

- [ ] **Step 2: Write `features/website-generator/components/publish-form.tsx`**

```typescript
"use client";

import * as React from "react";
import Link from "next/link";
import { useFormState } from "react-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  publishAction,
  unpublishAction,
  type PublishFormState,
} from "../actions";
import { normalizeSlug } from "../slug";

const initialState: PublishFormState = {};

/**
 * Publish control — Ph5.md's "Manage website" surface. After a successful
 * publish/unpublish, the parent Server Component page re-fetches (each
 * action calls revalidatePath) and passes fresh props down — the same
 * pattern Phase 4's AssetDetailSheet already relies on, so this component
 * derives its displayed state from props, not from the form action's
 * returned state (which only ever carries an error message here).
 */
export function PublishForm({
  invitationId,
  currentSlug,
  isPublished,
  publicUrl,
}: {
  invitationId: string;
  currentSlug: string | null;
  isPublished: boolean;
  publicUrl: string | null;
}) {
  const [publishState, runPublish] = useFormState(publishAction, initialState);
  const [unpublishState, runUnpublish] = useFormState(
    unpublishAction,
    initialState,
  );
  const [slug, setSlug] = React.useState(currentSlug ?? "");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          {isPublished ? "Your website is live" : "Publish your website"}
        </CardTitle>
        <CardDescription>
          {isPublished
            ? "Share the link or QR code below with your guests."
            : "Choose a web address for your guests to visit."}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isPublished && publicUrl ? (
          <div className="space-y-3">
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              <Link
                href={publicUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="underline"
              >
                {publicUrl}
              </Link>
            </div>

            {currentSlug ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/qr/${currentSlug}`}
                alt="QR code linking to your website"
                className="size-40 rounded border border-border"
              />
            ) : null}

            <form action={runUnpublish}>
              <input type="hidden" name="invitationId" value={invitationId} />
              <Button type="submit" variant="outline">
                Unpublish
              </Button>
            </form>
            {unpublishState.error ? (
              <p role="alert" className="text-sm text-destructive">
                {unpublishState.error}
              </p>
            ) : null}
          </div>
        ) : (
          <form action={runPublish} className="space-y-3">
            <input type="hidden" name="invitationId" value={invitationId} />
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/e/</span>
              <Input
                name="slug"
                value={slug}
                onChange={(event) => setSlug(normalizeSlug(event.target.value))}
                placeholder="ana-and-ben-2026"
                required
              />
            </div>
            {publishState.error ? (
              <p role="alert" className="text-sm text-destructive">
                {publishState.error}
              </p>
            ) : null}
            <Button type="submit">Publish</Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
```

- [ ] **Step 3: Write `app/(dashboard)/dashboard/events/[id]/website/page.tsx`**

```typescript
import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { getProfile } from "@/lib/auth/session";
import { routes, features } from "@/lib/config";
import { getInvitationForManage } from "@/features/website-generator/repository";
import { PublishForm } from "@/features/website-generator/components/publish-form";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Manage Website" };

export const dynamic = "force-dynamic";

/**
 * Publish control — Ph5.md. A new dashboard surface, not an addition to
 * Phase 3's builder step registry: the builder still ends at "preview," and
 * this is what happens after a customer is done and ready to go live.
 */
export default async function EventWebsitePage({
  params,
}: {
  params: { id: string };
}) {
  if (!features.websiteGenerator) notFound();

  const profile = await getProfile();
  if (!profile) redirect(routes.login);

  const invitation = await getInvitationForManage(profile.id, params.id);
  if (!invitation) notFound();

  if (invitation.status !== "COMPLETED") {
    return (
      <>
        <PageHeader
          title="Manage website"
          breadcrumbs={[
            { label: "Dashboard", href: routes.dashboard.root },
            { label: "My Events", href: routes.dashboard.events },
            { label: "Website" },
          ]}
        />
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Finish this invitation in the builder before publishing it.
          </CardContent>
        </Card>
      </>
    );
  }

  const publicUrl = invitation.slug
    ? `${env.app.url}${routes.publicEvent(invitation.slug)}`
    : null;

  return (
    <>
      <PageHeader
        title="Manage website"
        description={`Publish "${invitation.title}" as a live website.`}
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard.root },
          { label: "My Events", href: routes.dashboard.events },
          { label: "Website" },
        ]}
      />

      <PublishForm
        invitationId={invitation.id}
        currentSlug={invitation.slug}
        isPublished={invitation.isPublished}
        publicUrl={publicUrl}
      />
    </>
  );
}
```

- [ ] **Step 4: Type-check and run the full suite**

```bash
pnpm typecheck && pnpm test
```

Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
git add features/website-generator/actions.ts features/website-generator/components/publish-form.tsx "app/(dashboard)/dashboard/events/[id]/website/page.tsx"
git commit -m "feat(website): add publish control"
```

---

### Task 13: "Manage website" and "RSVPs" entries on completed invitations

**Files:**
- Modify: `features/invitation-builder/components/draft-menu.tsx`
- Modify: `features/invitation-builder/components/draft-card.tsx` (one new prop passed through)

`DraftMenu` is owned by `features/invitation-builder`, and this task adds two links
into it that point at `features/website-generator`-owned pages. This is not a
cross-feature import — the links are plain `<Link href={routes...}>` using the
shared route registry (Task 2), the exact "hand off between features via a shared
route in config, never a direct feature import" pattern this codebase has used since
Phase 3 (`routes.builderNew` referenced from the marketplace).

**Interfaces:**
- Consumes: `routes.dashboard.eventWebsite`, `routes.dashboard.eventRsvps` (Task 2).
- Produces: nothing new — this task only adds UI entry points to already-built pages.

- [ ] **Step 1: Pass `status` through `DraftCard`**

In `features/invitation-builder/components/draft-card.tsx`, change:

```typescript
export function DraftCard({
  draft,
  snapshot,
}: {
  draft: {
    id: string;
    title: string;
    status: string;
    eventTitle: string | null;
    eventDate: Date | null;
    updatedAt: Date;
    template: { name: string; coverImageUrl: string } | null;
  };
  snapshot: CompletenessSnapshot;
}) {
```

Only the call site changes here — the prop type already includes `status`. Change:

```typescript
            <div className="relative z-10">
              <DraftMenu invitationId={draft.id} title={draft.title} />
            </div>
```

to:

```typescript
            <div className="relative z-10">
              <DraftMenu
                invitationId={draft.id}
                title={draft.title}
                status={draft.status}
              />
            </div>
```

- [ ] **Step 2: Add the two menu items in `DraftMenu`**

In `features/invitation-builder/components/draft-menu.tsx`, change the imports from:

```typescript
"use client";

import * as React from "react";
import { MoreVertical, Trash2, Pencil } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteDraft } from "../actions";
import { notify } from "@/lib/hooks/use-toast";
import { routes } from "@/lib/config";
import Link from "next/link";
```

to:

```typescript
"use client";

import * as React from "react";
import { MoreVertical, Trash2, Pencil, Globe, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteDraft } from "../actions";
import { notify } from "@/lib/hooks/use-toast";
import { routes } from "@/lib/config";
import Link from "next/link";
```

Change the function signature from:

```typescript
export function DraftMenu({
  invitationId,
  title,
}: {
  invitationId: string;
  title: string;
}) {
```

to:

```typescript
export function DraftMenu({
  invitationId,
  title,
  status,
}: {
  invitationId: string;
  title: string;
  status: string;
}) {
```

Then add the two new items, right after the existing "Open and rename" item and
before the "Delete" item:

```typescript
        <DropdownMenuItem asChild>
          <Link href={`${routes.builder}/${invitationId}`}>
            <Pencil aria-hidden="true" />
            Open and rename
          </Link>
        </DropdownMenuItem>

        {status === "COMPLETED" ? (
          <>
            <DropdownMenuItem asChild>
              <Link href={routes.dashboard.eventWebsite(invitationId)}>
                <Globe aria-hidden="true" />
                Manage website
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={routes.dashboard.eventRsvps(invitationId)}>
                <Users aria-hidden="true" />
                View RSVPs
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}

        <DropdownMenuItem
          onSelect={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 aria-hidden="true" />
          Delete
        </DropdownMenuItem>
```

- [ ] **Step 3: Type-check**

```bash
pnpm typecheck
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
git add features/invitation-builder/components/draft-card.tsx features/invitation-builder/components/draft-menu.tsx
git commit -m "feat(website): add Manage website and View RSVPs to completed invitations"
```

---

### Task 14: Full verification, CHANGELOG entry, and final self-review

**Files:**
- Modify: `CHANGELOG.md` (append a Phase 5 entry under `## [Unreleased]` → `### Added`,
  before the existing Phase 4 entry — newest phase first, matching this file's
  existing order)

**Interfaces:** none — this task verifies everything Tasks 1-13 built and records it.

- [ ] **Step 1: Full automated verification**

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Expected: all four exit 0. If this plan is executed inside a nested git worktree
(per `superpowers:using-git-worktrees`), `pnpm lint` may fail with an ESLint
config-cascade conflict unrelated to this phase's code — see Phase 4's plan, Task 18,
for the full diagnosis. Confirm by running the identical `pnpm lint` from the main
repo checkout; if it passes cleanly there, the failure is the known worktree
artifact, not a regression, and does not block this task.

- [ ] **Step 2: Manual verification against a real database**

Start the local dev database and app:

```bash
pnpm db:local
pnpm prisma:deploy
pnpm prisma:seed
pnpm dev
```

Set `NEXT_PUBLIC_FEATURE_WEBSITE_GENERATOR=true` in `.env.local` first. Then, signed
in as a test customer with a `COMPLETED` invitation (build and finish one via the
existing builder flow if none exists):

- [ ] From "My Events," open the menu on a completed invitation and choose "Manage
      website." Confirm the finish-first message does **not** appear (status is
      already `COMPLETED`).
- [ ] Enter a slug and publish. Confirm the page now shows the live URL and a QR
      code image.
- [ ] Visit the public URL in a private/incognito window (no session). Confirm the
      page renders: title, date/time, hosts, venues with a working "View on Google
      Maps" link, programme, gallery, and countdown (if the event date is in the
      future).
- [ ] Confirm a section switched off in the builder's Personalize step (Ph3.md §6)
      is also hidden on the public site.
- [ ] Submit the RSVP form as a guest (no session). Confirm a success message
      appears, and the response shows up on the customer's `/dashboard/events/[id]/
      rsvps` page.
- [ ] Submit RSVP with attendance "no." Confirm it lists as "Not attending" and does
      not count toward the attending-guest total.
- [ ] From the customer's dashboard, unpublish the site. Confirm the public URL now
      404s (in the private window), and re-visiting "Manage website" shows the
      "Publish" form again but **with the same slug already filled in**.
- [ ] Republish without changing the slug. Confirm it succeeds (the slug conflicts
      only with a different invitation's slug, not its own).
- [ ] Try to publish a `DRAFT` invitation by directly submitting to the publish
      action with its id (e.g. via browser dev tools) while it is not `COMPLETED`.
      Confirm the server rejects it — this is the actual enforcement, not just the
      UI hiding the button.
- [ ] Request `/api/media/<a-published-invitation-photo-id>/<version>/preview` in the
      same private/incognito window (no session). Confirm it serves the image.
- [ ] Request the same URL for a photo belonging to an invitation that is **not**
      published. Confirm 404.
- [ ] Confirm `generateMetadata`'s output (view page source or use a social-preview
      debugger) shows the event title and cover photo for a published invitation,
      and that an unpublished/nonexistent slug's page has no such metadata (because
      it never reaches `generateMetadata` — it 404s first).

- [ ] **Step 3: Append the CHANGELOG entry**

Add a new bullet group to `CHANGELOG.md` under `## [Unreleased]` → `### Added`,
immediately before the existing "Phase 4 — Invitation Media Library" entry:

```markdown
- Phase 5 — Website Generator.
  - A public, guest-facing event website at a customer-chosen web address
    (`/e/<slug>`) — no account needed to view it. Publish state
    (`Invitation.isPublished`) is the actual access boundary; the slug is
    memorable, not a security token.
  - The same view-model contract Phase 3 built for the in-app preview
    (`toPreviewModel`) now renders the real site too — relocated to
    `lib/invitation/` so a second feature could use it without a cross-feature
    import, rather than duplicating the resolution logic.
  - RSVP (§3): guests respond without an account; the customer sees every
    response on a new dashboard page.
  - Countdown, a Google Maps link per venue, a full gallery, and a QR code for
    the published URL — all derived from data the Ph1-4 schema already has, no
    new invitation-content fields.
  - Ph4's media-serving route now serves a photo to an anonymous guest when it
    belongs to a currently published invitation, alongside its existing
    session-ownership check — one route, one set of storage objects, for both
    the dashboard and the public site.
```

- [ ] **Step 4: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: add Phase 5 changelog entry"
```

---

## Self-Review

**Spec coverage** (against
`docs/superpowers/specs/2026-07-19-phase5-website-generator-design.md`):

| Design doc section | Task |
|---|---|
| Decision 1 — customer-chosen slug | Task 4 (`slug.ts`), Task 6 (`isSlugAvailable`), Task 12 (publish form) |
| Decision 2 — single `isPublished` boolean, COMPLETED-gated | Task 1 (schema), Task 6 (`publishInvitation`'s server-side status check) |
| Decision 3 — RSVP scope, dashboard view included | Task 1 (`RsvpResponse`), Task 10 (submission), Task 11 (dashboard view) |
| Decision 4 — guest media access via extended serving route | Task 5 |
| Decision 5 — relocate the shared view model | Task 3 |
| Data model changes | Task 1 |
| Architecture: public route + metadata | Task 9 |
| Architecture: countdown | Task 7, Task 9 |
| Architecture: maps link-out | Task 9 |
| Architecture: gallery | Task 9 |
| Architecture: QR code | Task 8 |
| Architecture: RSVP submission + dashboard view | Task 10, Task 11 |
| Architecture: publish control | Task 12, Task 13 |
| Testing approach | Tasks 4, 7 unit-tested; DB-backed reads/writes verified in Task 14 |
| Out of scope | Nothing in this plan builds custom domains, PDF, booking/payment, guest accounts, embedded Maps, spam protection, or analytics — confirmed absent from every task above |

No gaps found.

**Placeholder scan:** every task above contains complete code, exact file paths, and
exact commands with expected output. No task says "add validation," "similar to Task
N," or leaves a function body undefined. The one `void thumbnailUrl;` placeholder
drafted mid-planning for Task 9 was caught and removed before this plan was finalized
— the import simply isn't needed on that page.

**Type consistency check:**
- `PreviewInput`/`PreviewModel`/`shows` (Task 3) are imported identically by Task 9's
  `event-site.tsx` and `app/e/[slug]/page.tsx` — same names, same module path
  (`@/lib/invitation/preview-model`) in both places.
- `PublicInvitation` (Task 6) carries `media[].asset` with `id`, `bucket`,
  `storagePath`, `altText`, `originalFilename`, `version`, `width` — exactly the
  shape Task 9's page passes to `previewUrl`/`thumbnailUrl` (`services/media`,
  already committed in Phase 4), which need `id`, `version`, `width` at minimum.
- `RsvpFormState` (Task 10) and `PublishFormState` (Task 12) are both declared once,
  in `features/website-generator/actions.ts`, and imported by exactly one component
  each (`rsvp-form.tsx`, `publish-form.tsx`) — no duplicate declarations.
- `EventSite`'s `invitationId` prop is accepted in Task 9 (passed by the page, which
  already has it) before Task 9's own render body uses it — Task 10 is the first to
  read it, wiring it into `<RsvpForm invitationId={invitationId} .../>`. Confirmed
  this isn't a lint violation: an accepted-but-not-yet-destructured-for-use prop is
  not an unused-variable error in this codebase's ESLint config (no
  `no-unused-vars` violation on parameters used by the type signature).
- `routes.dashboard.eventWebsite`/`eventRsvps` (Task 2) match the literal path
  segments Task 11/Task 12's actual page files live at
  (`app/(dashboard)/dashboard/events/[id]/rsvps/page.tsx`,
  `.../[id]/website/page.tsx`) and what Task 13's `DraftMenu` links to — all three
  reference the same route functions, not hand-written path strings.

No inconsistencies found.
