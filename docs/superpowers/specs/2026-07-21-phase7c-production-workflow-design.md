# Phase 7c — Internal Production Workflow

**Date:** 2026-07-21
**Source spec:** `raw/ML Digital Event Platform (ML-DEP) Ph7.md`
**Sub-project of:** Phase 7, decomposed per `docs/superpowers/PHASE7-KICKOFF.md`

## Objective

Give ML Printing's staff a working view of what is in production and who is
doing it, and give the platform the order model everything else in Phase 7 will
hang off.

This is the *internal* half. Customers see nothing new in this sub-project.

## Why the order core is designed here, deliberately

Phase 7 was split into four sub-projects and 7c was chosen to go first. 7c
cannot exist without an order model, so that model gets built here regardless.

The risk that creates: an order model shaped by whatever the kanban board
happened to need, which is expensive to change once customer-facing 7b is built
on it. The mitigation is this section — the entities below are derived from
Ph7.md §2's lifecycle, not from the board, and they model states 7c does not yet
exercise (quotation, approval, cancellation) because 7b and 7d will.

## Scope

In scope:

1. Order core — `Order`, `OrderItem`, `OrderEvent`, `OrderNote` (Ph7.md §1, §2, §12)
2. Controlled, audited status transitions (§2)
3. Production dashboard with kanban queue (§4, §10)
4. Task assignment — assignee, due date, priority (§7)
5. Internal notes, staff-only (§8)
6. Website and print status tracking, read-only (§11)
7. Staff/admin access control

Out of scope, and where each belongs:

- Customer dashboard, proof review, approval *screens*, revision requests → **7b**
- Notifications, search and filtering, reporting → **7d**
- Online payment, deployment automation, shipping, accounting, inventory →
  later phases, per Ph7.md's own Out of Scope

Approval and revision *state* is modelled here. Only the customer-facing screens
that set it are deferred. Modelling them later would mean migrating the status
enum twice.

## Entities

### `Order`

One commercial engagement. What a customer would call "my booking".

| Field | Notes |
|---|---|
| `id` | uuid |
| `profileId` | the customer |
| `invitationId` | the event, nullable — an inquiry can exist before a draft does |
| `reference` | human-facing booking ID, `ML-<year>-<4-digit sequence>`, e.g. `ML-2026-0042`; unique. Sequence restarts each calendar year and is derived from the highest existing reference for that year, not a row count — deleting an order must never hand the same reference out twice. |
| `status` | `OrderStatus` |
| `assignedToId` | staff owner, nullable |
| `dueDate` | nullable |
| `createdAt` / `updatedAt` | |

`invitationId` is nullable on purpose: Ph7.md §2 starts the lifecycle at
*Inquiry*, which precedes any design work.

### `OrderItem`

One deliverable. This is what the production board moves.

| Field | Notes |
|---|---|
| `id` | uuid |
| `orderId` | |
| `kind` | `OrderItemKind` |
| `status` | `OrderItemStatus` |
| `quantity` | int, default 1 — a print run of 150 |
| `assignedToId` | staff, nullable (§7) |
| `dueDate` | nullable (§7) |
| `priority` | `Priority`, default `NORMAL` (§7) |
| `pdfGenerationId` | nullable; set for print items once a file exists |
| `notes` | short free text — §7's per-*task* note, e.g. "stock arrives Tuesday". Distinct from `OrderNote`, which is order-level commentary; this one travels with the deliverable and shows on its board card. |

Splitting deliverables out is what makes reprints and staged delivery
representable. A wedding ordering invitations now, a website next week and a
reprint after a typo is one `Order` with three `OrderItem`s — not three orders
duplicating the event linkage.

### `OrderEvent`

Append-only audit trail (§12). Never updated, never deleted.

| Field | Notes |
|---|---|
| `id`, `orderId` | |
| `orderItemId` | nullable — item-level events reference both |
| `actorId` | nullable; null means the system did it |
| `type` | `STATUS_CHANGE`, `ASSIGNED`, `NOTE_ADDED`, `ITEM_ADDED`, `GENERATED` |
| `fromStatus` / `toStatus` | nullable strings, not enums — one column serves both status enums |
| `message` | nullable |
| `createdAt` | |

`fromStatus`/`toStatus` are strings because this one table records transitions of
two different enums. Two nullable enum column pairs would be worse.

### `OrderNote`

Staff-only operational notes (§8). Separate from `OrderEvent` because a note is
authored prose, not a recorded fact, and because 7b will expose events to
customers while notes must never be exposed.

## Status enums

Ph7.md §2 lists 13 states in one chain, but they are two different granularities:
*Quotation* is commercial, *Quality Check* applies to one physical item. Forcing
both into one enum would mean an order sitting in "Print Production" while its
website half is untouched.

```
OrderStatus:     INQUIRY → QUOTATION → CONFIRMED → IN_PROGRESS → COMPLETED → ARCHIVED
                 (CANCELLED reachable from any non-terminal state)

OrderItemStatus: PENDING → DRAFT_CREATION → CUSTOMER_REVIEW → REVISION → APPROVED
                 → IN_PRODUCTION → QUALITY_CHECK → READY_FOR_RELEASE → COMPLETED
                 (REVISION returns to DRAFT_CREATION; CANCELLED from any non-terminal)
```

Mapping back to Ph7.md §2, so nothing silently disappears:

| Ph7.md state | Lands as |
|---|---|
| Inquiry | `OrderStatus.INQUIRY` |
| Quotation | `OrderStatus.QUOTATION` |
| Booking Confirmed | `OrderStatus.CONFIRMED` |
| Draft Creation | `OrderItemStatus.DRAFT_CREATION` |
| Customer Review | `OrderItemStatus.CUSTOMER_REVIEW` |
| Revision | `OrderItemStatus.REVISION` |
| Approved | `OrderItemStatus.APPROVED` |
| Website Generation | `OrderItemStatus.IN_PRODUCTION` on a `WEBSITE` item |
| PDF Generation | `OrderItemStatus.IN_PRODUCTION` on a print item |
| Print Production | `OrderItemStatus.IN_PRODUCTION` |
| Quality Check | `OrderItemStatus.QUALITY_CHECK` |
| Ready for Release | `OrderItemStatus.READY_FOR_RELEASE` |
| Completed | both, at their own level |
| Archived | `OrderStatus.ARCHIVED` |

"Website Generation", "PDF Generation" and "Print Production" collapse into one
item status because they are the same state of different `kind`s. The `kind`
already says which; a separate status per kind would make the board's columns
depend on the row.

Supporting enums: `OrderItemKind { INVITATION_PRINT, WEBSITE, REPRINT, OTHER }`,
`Priority { LOW, NORMAL, HIGH, URGENT }`.

## Transitions

A pure, exhaustively tested table — `canTransition(from, to)` for each enum — not
conditionals spread across actions. Ph7.md §2 requires transitions be "controlled
and auditable"; a rule table is the controllable part, `OrderEvent` the auditable
part.

Rules:

- Only transitions named in the table are permitted; everything else is rejected
  with the attempted pair in the message.
- `COMPLETED` and `ARCHIVED` are terminal. `CANCELLED` is terminal and reachable
  from any non-terminal state.
- Every accepted transition writes an `OrderEvent` **in the same transaction**.
  A status change without an audit row is the failure this design exists to
  prevent, so it must not be possible to write one without the other.
- An `Order` moves to `IN_PROGRESS` when its first item leaves `PENDING`, and to
  `COMPLETED` only when every item is `COMPLETED` or `CANCELLED`. Derived on
  write, not by a background job.

## Deriving rather than duplicating status

Ph7.md §11 says the website module tracks status only. Where the truth already
lives elsewhere, 7c reads it:

- Website deployment state → `Invitation.isPublished` (Phase 5).
- Print file state → `PdfGeneration.status` (Phase 6), via `OrderItem.pdfGenerationId`.

The one unavoidable duplication is `OrderItemStatus` itself. A print item can be
`QUALITY_CHECK` while its `PdfGeneration` has been `READY` for days — the PDF
existing is not the job being done. So the item's status is authoritative for
*workflow*, and the linked records are authoritative for *artefacts*. The UI
shows both and never silently reconciles them.

## Access control

Every 7c surface is staff-only. A `requireStaff()` helper returns the profile
when `role` is `ADMIN` or `STAFF`, and otherwise triggers `notFound()` — not a
redirect, which would confirm the page exists.

Enforced in Server Actions as well as page loads. Hiding a control in the UI is
not access control; the action is reachable by POST regardless of what rendered.

## Module structure

```
services/orders/            engine — transitions, derivation, persistence
  types.ts                  shared types
  status.ts                 the transition tables, pure + tested
  derive.ts                 order status from its items, pure + tested
  repository.ts             Prisma, ownership/role scoped
  index.ts                  barrel; nothing outside imports past it
features/production/        internal workflow feature
  actions.ts                staff Server Actions
  board.ts                  grouping items into columns, pure + tested
  components/               kanban board, item card, assignment control, notes
app/(dashboard)/admin/production/page.tsx   kanban (replaces placeholder)
app/(dashboard)/admin/bookings/page.tsx     order list (replaces placeholder)
```

Follows the Phase 6 shape: a pure, tested engine under `services/`, orchestration
and UI under `features/`, and features depending on services but never the
reverse.

## Testing

| Unit | Covered by |
|---|---|
| `canTransition` for both enums | exhaustive table tests, including every rejection |
| terminal-state rules | explicit tests that `COMPLETED`/`ARCHIVED`/`CANCELLED` accept nothing |
| order status derivation | tests over item-status combinations, including empty and all-cancelled |
| board grouping | pure tests: column membership, ordering, priority sort |
| repository scoping | a non-staff profile sees nothing |

Repository and UI follow existing conventions; no test file for thin Prisma
wrappers, matching `services/media` and `services/pdf`.

## Migration

New tables only — no changes to existing ones except a nullable back-relation.
Follows the project's standing workaround: `prisma migrate diff` then
`prisma migrate deploy`. **Never `prisma migrate dev`.**

## Success criteria

- Staff can see every in-flight deliverable on one board and move it between
  columns; a customer cannot reach any of it.
- Illegal transitions are rejected, and every legal one leaves an audit row.
- An order's status follows its items without anyone maintaining it by hand.
- Reprints and staged delivery are representable without duplicating an order.
- `lint`, `typecheck`, `test`, `build` all clean.
