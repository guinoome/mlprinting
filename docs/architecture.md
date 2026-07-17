# Architecture

**Status:** Phase 3. Describes the foundation as built plus the boundaries later
phases must respect. Update this doc whenever module boundaries or data flow
change (V1 doc §13, Repository Memory).

---

## The core idea

One structured dataset produces two products.

```
                Guided Invitation Builder (Phase 3)
                              │
                              ▼
                  ┌───────────────────────┐
                  │   Invitation data     │  ← structured, presentation-free
                  │   (the source of      │
                  │    truth)             │
                  └───────────┬───────────┘
                              │
              ┌───────────────┴───────────────┐
              ▼                               ▼
    Website Generator (Ph5)         PDF Generator (Ph6)
              │                               │
              ▼                               ▼
      Live event website              Press-ready print file
```

This is the *Design Once, Deliver Everywhere* principle (V1 doc §7), and it is
the single most important constraint in the codebase: **invitation data must
never carry presentation details**. A colour, font, or page coordinate stored on
the event record couples the website and the print output together, and the two
have irreconcilable layout needs. Presentation belongs to templates and themes.

**As of Phase 3 this is enforced, not aspirational.** Three records, three
owners:

| Record | Owns | Example |
|---|---|---|
| `Invitation` (+ hosts, venues, content, people, programme) | What the event IS | "The reception is at 6pm at Marco Polo Plaza" |
| `Template` | What the design LOOKS like | The artwork, the layout |
| `InvitationPersonalization` | Which approved choices were made | `colorTheme: "midnight-navy"` |

Two rules make the seam hold:

- **No raw values, anywhere.** Personalization stores *slugs* from
  `lib/config/design-vocabulary.ts` — never a hex, never a font stack. That is
  what makes Ph3.md §6's "customization must remain within the approved design
  system" checkable, and it is why there is no colour picker. A hex column would
  also hand Ph6's press output colours no ink can reproduce.
- **The resolution happens in one place.** `features/invitation-builder/preview/model.ts`
  turns slugs into values. Ph5's website generator is meant to import that model
  and write its own renderer on top; duplicating the resolution is how the
  preview and the real site start disagreeing about what the invitation says.

The test: *if you can imagine the print generator reading a field and having no
idea what to do with it, that field is in the wrong table.*

One subtlety worth keeping. `Invitation.eventTheme` ("Enchanted Garden") is
**content** — a phrase printed on the card. `InvitationPersonalization.colorTheme`
is **presentation**. Ph3.md lists them in different sections (§2 vs §6) for
exactly this reason, and they are not the same "theme".

The parallel rule for assets is *Capture Once, Reuse Everywhere* (Ph4.md): a
customer uploads a photo once, and the Media Library is the only owner of it.
Both generators reference assets by id; neither copies bytes.

---

## Layers

```
app/         Routing, layouts, pages. Thin — composition only.
   │
features/    Domain modules. One folder per business capability.
   │
services/    Shared capabilities features call (media, PDF, deploy).
   │
lib/         Framework-agnostic utilities. Depends on nothing above it.
```

Dependencies point downward only:

- `app/` may import from `features/`, `components/`, `services/`, `lib/`.
- `features/` may import from `components/`, `services/`, `lib/` — **never from
  another feature**. Two features needing the same logic means it belongs in
  `services/`.
- `services/` may import from `lib/` only. A service never imports a feature —
  Ph4.md §15 states this explicitly for the Media Library, and it generalizes:
  services are depended upon, they do not depend.
- `lib/` imports nothing from the app.

Why the no-cross-feature rule matters: the marketplace, builder, media library,
booking, and payment modules are each substantial. Direct imports between them
produce a graph where changing one breaks four others, and the codebase stops
being separable long before the MVP is finished.

---

## Data

**Postgres via Supabase**, accessed through **Prisma**.

Auth identities live in Supabase's `auth.users`, which Prisma does not manage.
`Profile` mirrors it by id and holds what Supabase Auth has no concept of —
role, display name, avatar. The two are joined by uuid, never merged.

Phase 3 defines identity (`Profile`, `Preference`), the template catalog
(`Template`, `TemplateCategory`, `TemplateCollection`, `TemplateScreenshot`,
`TemplateFavorite`, `TemplateView`, `TemplateUse`), and the invitation dataset
(`Invitation`, `InvitationHost`, `InvitationVenue`, `InvitationContent`,
`InvitationPerson`, `ProgramItem`, `InvitationPersonalization`,
`InvitationMedia`, `MediaAsset`). Remaining: `Booking`/`Order` (Phase 7),
`Payment`/`Deployment` (Phase 8).

**Wall-clock times are strings, not DateTimes.** `eventTime` and
`InvitationVenue.startTime` store `"15:00"`. "The ceremony is at 3pm" is a fact
about the venue's clock, not an instant — round-tripping it through UTC is how a
printed invitation ends up announcing a 7am reception. `eventDate` carries the
instant; `timeZone` renders it.

**`MediaAsset` is Phase 4's, held in trust.** Ph3.md §7 says "Connect to the
Invitation Media Library" and the Success Criteria require uploading media —
but the Library is Ph4. Rather than build a parallel store Ph4 would have to
unpick, Phase 3 introduced the minimum record Ph4 will own, shaped to the
contract Ph4.md already specifies (§9 no duplicates, §10 replace preserving
references, §11 delete protection, §15 nothing depends on its consumers).
Phase 4 adds folders, processing, search, and the browser on top.

**Categories are rows, not an enum.** Ph2.md §1 requires that future categories
need no code change, so adding "Reunion" is an INSERT and the filter UI reads
the table. The same section lists Featured, New, Premium, and Seasonal alongside
Wedding and Birthday — but those are not the same kind of thing, and one flat
list would stop a template being both Premium and a Wedding. They are split by
what they are: event type → `TemplateCategory`, price → `Template.tier`,
curation → `isFeatured`, recency → derived from `publishedAt`, season →
`TemplateCollection` with a date window.

`Profile` rows are reconciled on first authenticated request rather than created
at signup (`lib/auth/session.ts`). A user exists the moment they confirm their
email — an event that happens outside this app — so a signup-time insert would
need a database trigger backing it up, and then two code paths would own the
same row and drift.

The Prisma client is constructed lazily (`lib/db.ts`). Instantiating it at module
load throws without `DATABASE_URL`, which would mean any page importing it breaks
the secret-less CI build.

---

## Auth

Supabase Auth, with sessions in cookies.

```
Request → middleware.ts → updateSession()
                              │
                    refresh session (getUser)
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
          protected route?           public route
                 │                         │
         no user → /login            continue
```

Two decisions worth keeping:

- Middleware calls `getUser()`, not `getSession()`. `getSession()` reads the
  cookie without verifying it against Supabase, so it can be spoofed. In
  middleware — the thing guarding every protected route — that distinction is
  the whole point.
- The protected-route list lives in `lib/auth/roles.ts`, not scattered across
  route files. Adding a protected area later means adding one string.

Phase 1 registers `/dashboard` and `/admin`.

**Two gates, two places, on purpose.** The middleware proves *who* you are; it
cannot decide *what* you may see, because the role is a Postgres column and
middleware runs on the edge without Prisma. So:

| Gate | Where | Question |
|---|---|---|
| Session | `middleware.ts` → `lib/supabase/middleware.ts` | Are you signed in? |
| Role | `app/(dashboard)/admin/layout.tsx` | Are you staff? |

The layouts re-check the session even though middleware already did. That is not
redundancy — a matcher gap or a config change silently disables middleware, and a
layout that assumes "something upstream checked" is how a dashboard renders to
nobody. Authorisation belongs next to the data it protects.

Authenticated routes are pinned `force-dynamic`. Without it, a build with no env
vars prerenders them: `getUser()` returns before touching cookies, Next sees
nothing dynamic, and the dashboard becomes static HTML served to everyone.

Per Ph1.md §4 there is still no permission system — roles gate whole route trees
and nothing finer. Resist adding per-action permissions until a phase asks.

---

## Design system

Tokens are CSS custom properties in `app/globals.css`, surfaced to Tailwind as
semantic names (`bg-primary`, `text-muted-foreground`) in `tailwind.config.ts`.

Components reference semantic tokens, never raw values. Rebranding then changes
the token layer only — no component edits. The current palette is a neutral
placeholder pending ML Printing's brand colours; because components never name a
colour, swapping it is a one-file change.

Variants use `class-variance-authority` (see `components/ui/button.tsx`). Extend
a component's variants rather than forking it.

Interactive primitives are built on Radix (dropdown, dialog, toast, switch,
avatar, label). The reason is accessibility behaviour that is tedious to
hand-roll and easy to half-finish: focus trapping, focus restoration, live-region
announcement, Escape handling, scroll lock.

---

## Cross-cutting frameworks

Phase 1 delivers four seams later phases plug into rather than reinvent:

| Framework | Lives in | Consumed by |
|---|---|---|
| Configuration (Ph1 §10) | `lib/config/` | Everything — branding, routes, flags, nav |
| Logging (Ph1 §9) | `lib/logger.ts` | Any `catch`; one `report()` seam for a future service |
| Notifications (Ph1 §7) | `lib/notifications/`, `components/ui/toast*` | Any client interaction |
| Uploads (Ph1 §8) | `services/upload/` | Ph4 Media Library, Ph1 avatars |
| Recommendations (Ph2 §8) | `services/recommendations/` | Ph2 marketplace; Ph3 builder |

Two shapes worth keeping:

- **The notification store is framework-free.** `notify()` is a plain module
  function, not a hook, because the most common caller is a `catch` block in an
  event handler where hook rules do not apply. React binds to it through
  `useSyncExternalStore`.
- **Feature flags are getters, not constants.** They read `process.env` at call
  time, so a flag cannot be frozen into a module at import. Every business
  capability ships dark and is gated to its phase — that is what lets Phases 2–10
  land incrementally instead of in one unreviewable drop.

The logger redacts credential-shaped keys before writing. Logs travel to places
credentials must not: consoles, aggregators, support tickets.

**The recommender is replaceable by contract.** Ph2.md §8 requires it, and two
properties buy it: a strategy is *handed* candidates and signals rather than
querying for them (so it can be an HTTP call to a model, and is testable without
a database), and it returns scores with reasons rather than a re-ordered list
(so a ranking stays auditable). Swapping implementations is one line in
`services/recommendations/index.ts`.

---

## The marketplace

```
URL search params  ──▶  criteria.ts  ──▶  query.ts  ──▶  repository.ts  ──▶  page
   (untrusted)          (parse+clamp)     (Prisma
                                          where/orderBy)
```

**The URL is the state.** Every filter, the sort, and the page live in search
params. That buys a shareable link, a working back button, and a server-rendered
first paint with the right results already in the HTML — none of which a
client-side filter store gives you. Filters render as `<Link>`s, so the whole
filter panel ships zero JavaScript and works before hydration.

`criteria.ts` and `query.ts` are pure and carry most of the marketplace's tests.
Ph2.md asks twice for this layer to stay extensible (§3, §4); a new filter is one
field in `criteria.ts` plus one clause in `query.ts`, and nothing else changes.

Two rules that are easy to break later:

- **`buildWhere` always constrains `publishedAt`**, unconditionally and first. A
  draft leaking into the catalog is the failure this function exists to prevent,
  so it is not a filter callers opt into.
- **Every `orderBy` ends with a unique tiebreaker.** Without one, rows with equal
  sort values have no stable order between pages: a template appears on both
  page 1 and page 2 while another never appears. It looks like a data bug and is
  a query bug.

---

## Deployment

Two distinct pipelines, easily confused:

**Platform deployment** (this repo, wired in Phase 0): push to GitHub → Vercel
builds and deploys ML-DEP itself.

**Per-order website deployment** (Phase 8, not built): an approved customer
order triggers the Website Generator, which commits the generated site and
deploys it. This one is a runtime feature of the product and depends on Phases
5–8 existing.

Phase 0 delivers the first, and only proves the wiring works — the site is not
made public (ML-DES.md §5).

---

## Testing

Vitest for unit tests, colocated (`lib/utils.test.ts` beside `lib/utils.ts`).
Playwright for end-to-end flows, in `e2e/`.

Unit tests are concentrated where a mistake is expensive and a test is cheap:
redirect sanitisation, upload validation, route matching, credential redaction,
and the marketplace's criteria/query layer. Components are not unit-tested —
their behaviour is Radix's, already tested upstream, and asserting that a div has
a class tests the test.

**Unit tests are not enough for the query layer**, and Phase 2 proved it. They
assert the *shape* of a `where` clause; they cannot tell you the SQL returns the
right rows, that pagination does not repeat a template, or that a `notFound()`
actually sets a 404. Run `pnpm db:local` and drive it.

`pnpm db:local` starts a real Postgres — PGlite, compiled to WebAssembly —
behind a TCP socket, so Prisma connects with an ordinary connection string and
migrations, the seed, and every query run offline with no credentials. Two
caveats: it serves one connection at a time, so append
`?pgbouncer=true&connection_limit=1` to the URL, and it is a development
convenience, not a substitute for testing against Supabase before a release.

`e2e/` still holds config only. The flows are worth driving end to end, but they
need a seeded Supabase project to sign into; that lands with the deployment gates
in `docs/deployment-workflow.md`.

---

## Known gaps

Carried from `Phase0-TechStack-Spec.md` §6 — open questions that need decisions
before the phases they affect:

- **`raw/…Ph5.md` is empty (0 bytes).** Sequence implies Website Generator.
  Must be written before Phase 5 starts.
- **Google Forms invitation autofill** — approved by the user, but absent from
  every phase doc. Proposed fit: an alternate intake path into Phase 3's
  builder. Needs a design pass.
- **GCash / QR Ph automatic payment verification** — conflicts with Ph8.md,
  which scopes MVP payment as *manual* verification (customer uploads a receipt,
  staff approves). Gateway auto-verification is "Future-ready" there and would
  introduce a paid service, requiring approval under V1 doc §11. Needs a
  decision at Phase 8.
- **QR-scan check-in** — user-approved override of the V1 §5 non-goal, but no
  phase doc owns it. Nearest fit: Phase 3 (RSVP) or Phase 7 (booking).

Raised in Phase 3:

- **The builder UI has not been driven end to end.** The data layer, the preview
  model, and every pure module are verified against a real Postgres (`pnpm
  db:local`), but the builder itself needs a signed-in session, and a Supabase
  project is a credentialed step nobody has completed yet. Autosave, the step
  flow, and the upload path are therefore *unexercised in a browser*. This is the
  highest-value thing to check once the deployment gates are done.
- **Autosave has no conflict handling.** Two tabs editing one draft will
  last-write-win, silently. Acceptable now — drafts are single-user and the
  window is seconds — but it is a real gap the moment collaboration appears.
- **`services/media` is a subset of Ph4.** No image processing, variants,
  folders, quotas, or search. Alt text is captured but nothing enforces it,
  though both generators will need it before publishing.
- **Print preview is an approximation.** Ph3.md §10 says "basic". No bleed, no
  crop marks, no CMYK, no real page geometry — Ph6 owns those.
- **Section visibility has no per-template awareness.** A template that cannot
  render a gallery will still offer the toggle. The template's `features` column
  (Ph2) is the obvious input; no phase doc connects the two yet.

Raised in Phase 2:

- **Template artwork is generated placeholder SVG.** `lib/placeholder-art.ts`
  exists because the marketplace needs cover images and ML Printing has not
  supplied any. When real artwork arrives it replaces `Template.coverImageUrl`
  and `TemplateScreenshot.url`, and that module should be deleted rather than
  left as a fallback nobody notices is still rendering.
- **Search is `ILIKE`, not full-text.** No ranking, no stemming, no typo
  tolerance. A deliberate ceiling at a catalog of dozens; `searchClause()` in
  `features/template-marketplace/query.ts` is the only place that changes when it
  needs to be a tsvector or a search service.
- **The recommender's weights are judgement, not measurement.** There is no usage
  data to fit them against yet. They are named constants so the judgement is
  arguable rather than buried.
- **No admin CRUD for templates.** Ph2.md's deliverables are a customer
  marketplace; the catalog is currently populated by `prisma/seed.ts`. Staff
  template management has no phase doc that owns it.

Raised in Phase 1:

- **Storage buckets are referenced but not provisioned.** `services/upload`
  writes to `avatars` (public) and `media` (private). Both must be created in
  Supabase with row-level security policies scoping writes to
  `<userId>/…` before uploads work — the path convention is enforced in code
  today, and code is not an access policy. See `docs/deployment-workflow.md`.
- **Email change has no flow.** Deliberately excluded from the account form
  (`features/account/schema.ts`): it is an identity change needing confirmation
  to both the old and new address, and treating it as an ordinary field is how an
  account is lost to a typo. Needs its own design.
- **No error-tracking service.** `logger.report()` is the seam; nothing consumes
  it. Choosing a service is a paid-tool decision under V1 §11.
- **Brand palette still placeholder.** Unblocked whenever ML Printing provides
  colours — one file, `app/globals.css`.
