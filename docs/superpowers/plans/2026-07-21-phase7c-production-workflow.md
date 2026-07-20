# Phase 7c — Internal Production Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give ML Printing's staff a kanban board of every in-flight deliverable, backed by an auditable order model that the rest of Phase 7 will build on.

**Architecture:** A pure, tested engine under `services/orders/` (transition tables, status derivation, reference numbering, persistence) with orchestration and UI under `features/production/`. Features depend on services, never the reverse — the same shape as `services/pdf` + `features/pdf-generation` in Phase 6.

**Tech Stack:** Next.js 14 App Router, Prisma 6, PostgreSQL (Supabase), TypeScript, Vitest, Tailwind.

**Spec:** `docs/superpowers/specs/2026-07-21-phase7c-production-workflow-design.md`

## Global Constraints

- **Never run `prisma migrate dev`.** It is broken against this project's local PGlite database (P1017). Use `prisma migrate diff --from-schema-datasource --to-schema-datamodel --script` then `prisma migrate deploy`. On a fresh worktree run `migrate deploy` FIRST to baseline, or the diff returns the entire schema instead of your delta.
- **Zero cross-feature imports.** `features/production/` may import `services/*` and `lib/*`, never another feature. Shared logic goes to `lib/`.
- **Every status transition writes an `OrderEvent` in the same transaction.** A status change without an audit row is the failure this phase exists to prevent.
- **Staff-only surfaces fail with `notFound()`, never a redirect.** A redirect confirms the page exists.
- **Enforce access in Server Actions, not only in page loads.** An action is reachable by POST regardless of what rendered.
- Terminal statuses: `COMPLETED`, `ARCHIVED`, `CANCELLED`. Nothing transitions out of them.
- Reference format: `ML-<year>-<4-digit sequence>`, e.g. `ML-2026-0042`. Sequence restarts each calendar year, derived from the highest existing reference for that year — never a row count.
- Baseline before starting: **468 tests passing**. That number must only go up.
- Verify with `pnpm typecheck` run on its own — **never pipe it into `tail`**, which masks the exit code and lets a broken commit land.
- Builds on this machine are memory-tight. Use `NODE_OPTIONS="--max-old-space-size=1536" pnpm build`.
- End every commit message with: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`

## File Structure

```
prisma/schema.prisma                      (modify — 4 models, 4 enums)
prisma/migrations/<ts>_phase7c_orders/    (create)

services/orders/
  types.ts          (create)  shared types, no Prisma import
  status.ts         (create)  transition tables — pure          + status.test.ts
  derive.ts         (create)  order status from its items — pure + derive.test.ts
  reference.ts      (create)  ML-YYYY-NNNN numbering — pure      + reference.test.ts
  repository.ts     (create)  Prisma; role-scoped; transactional transitions
  index.ts          (create)  barrel — nothing outside imports past it

lib/auth/require-staff.ts   (create)  role gate                  + require-staff.test.ts

features/production/
  board.ts          (create)  grouping + ordering — pure         + board.test.ts
  actions.ts        (create)  staff Server Actions
  components/board-column.tsx  (create)
  components/item-card.tsx     (create)
  components/production-board.tsx (create)

app/(dashboard)/admin/production/page.tsx  (modify — replace placeholder)
app/(dashboard)/admin/bookings/page.tsx    (modify — replace placeholder)

docs/order-workflow.md   (create)
CHANGELOG.md             (modify)
```

---

### Task 1: Schema — orders, items, events, notes

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<YYYYMMDDHHmmss>_phase7c_orders/migration.sql`

**Interfaces:**
- Produces: `Order`, `OrderItem`, `OrderEvent`, `OrderNote` models and
  `OrderStatus`, `OrderItemStatus`, `OrderItemKind`, `Priority`, `OrderEventType`
  enums — consumed by Tasks 2–6, 9.

- [ ] **Step 1: Append the enums and models**

Add at the end of `prisma/schema.prisma`:

```prisma

enum OrderStatus {
  INQUIRY
  QUOTATION
  CONFIRMED
  IN_PROGRESS
  COMPLETED
  ARCHIVED
  CANCELLED
}

enum OrderItemStatus {
  PENDING
  DRAFT_CREATION
  CUSTOMER_REVIEW
  REVISION
  APPROVED
  IN_PRODUCTION
  QUALITY_CHECK
  READY_FOR_RELEASE
  COMPLETED
  CANCELLED
}

enum OrderItemKind {
  INVITATION_PRINT
  WEBSITE
  REPRINT
  OTHER
}

enum Priority {
  LOW
  NORMAL
  HIGH
  URGENT
}

enum OrderEventType {
  STATUS_CHANGE
  ASSIGNED
  NOTE_ADDED
  ITEM_ADDED
  GENERATED
}

/// One commercial engagement — Ph7.md §1. What a customer calls "my booking".
model Order {
  id        String @id @default(uuid()) @db.Uuid
  profileId String @db.Uuid

  /// Nullable: Ph7.md §2 starts the lifecycle at Inquiry, which precedes any
  /// design work, so an order can exist before an invitation does.
  invitationId String? @db.Uuid

  /// Human-facing booking ID, "ML-2026-0042". Unique across all years.
  reference String @unique

  status       OrderStatus @default(INQUIRY)
  assignedToId String?     @db.Uuid
  dueDate      DateTime?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  profile    Profile     @relation("OrderCustomer", fields: [profileId], references: [id], onDelete: Cascade)
  assignedTo Profile?    @relation("OrderAssignee", fields: [assignedToId], references: [id], onDelete: SetNull)
  invitation Invitation? @relation(fields: [invitationId], references: [id], onDelete: SetNull)

  items  OrderItem[]
  events OrderEvent[]
  notes  OrderNote[]

  @@index([status, createdAt])
  @@index([profileId])
  @@index([assignedToId])
  @@map("orders")
}

/// One deliverable — a print run, a website, a reprint. This is what the
/// production board moves. Splitting deliverables out is what makes reprints
/// and staged delivery representable without duplicating an order.
model OrderItem {
  id      String @id @default(uuid()) @db.Uuid
  orderId String @db.Uuid

  kind     OrderItemKind
  status   OrderItemStatus @default(PENDING)
  quantity Int             @default(1)

  assignedToId String?  @db.Uuid
  dueDate      DateTime?
  priority     Priority @default(NORMAL)

  /// Set for print items once a file exists — Phase 6's PdfGeneration.
  pdfGenerationId String? @db.Uuid

  /// Ph7.md §7's per-task note, e.g. "stock arrives Tuesday". Shows on the
  /// board card. Distinct from OrderNote, which is order-level commentary.
  notes String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  order         Order          @relation(fields: [orderId], references: [id], onDelete: Cascade)
  assignedTo    Profile?       @relation("OrderItemAssignee", fields: [assignedToId], references: [id], onDelete: SetNull)
  pdfGeneration PdfGeneration? @relation(fields: [pdfGenerationId], references: [id], onDelete: SetNull)

  events OrderEvent[]

  @@index([status, priority])
  @@index([orderId])
  @@index([assignedToId])
  @@map("order_items")
}

/// Append-only audit trail — Ph7.md §12. Never updated, never deleted.
model OrderEvent {
  id          String  @id @default(uuid()) @db.Uuid
  orderId     String  @db.Uuid
  orderItemId String? @db.Uuid

  /// Null means the system did it rather than a person.
  actorId String? @db.Uuid

  type OrderEventType

  /// Strings, not enums: this one table records transitions of two different
  /// status enums, and two nullable enum column pairs would be worse.
  fromStatus String?
  toStatus   String?

  message String?

  createdAt DateTime @default(now())

  order     Order      @relation(fields: [orderId], references: [id], onDelete: Cascade)
  orderItem OrderItem? @relation(fields: [orderItemId], references: [id], onDelete: Cascade)
  actor     Profile?   @relation("OrderEventActor", fields: [actorId], references: [id], onDelete: SetNull)

  @@index([orderId, createdAt])
  @@map("order_events")
}

/// Staff-only operational notes — Ph7.md §8. Separate from OrderEvent because a
/// note is authored prose, not a recorded fact, and because 7b will expose
/// events to customers while these must never be exposed.
model OrderNote {
  id       String @id @default(uuid()) @db.Uuid
  orderId  String @db.Uuid
  authorId String @db.Uuid

  body String

  createdAt DateTime @default(now())

  order  Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  author Profile @relation("OrderNoteAuthor", fields: [authorId], references: [id], onDelete: Cascade)

  @@index([orderId, createdAt])
  @@map("order_notes")
}
```

- [ ] **Step 2: Add the back-relations**

In `model Profile`, after `mediaAssets MediaAsset[]`, add:

```prisma
  orders          Order[]      @relation("OrderCustomer")
  assignedOrders  Order[]      @relation("OrderAssignee")
  assignedItems   OrderItem[]  @relation("OrderItemAssignee")
  orderEvents     OrderEvent[] @relation("OrderEventActor")
  orderNotes      OrderNote[]  @relation("OrderNoteAuthor")
```

In `model Invitation`, after `pdfGenerations PdfGeneration[]`, add:

```prisma
  orders          Order[]
```

In `model PdfGeneration`, after `invitation Invitation @relation(...)`, add:

```prisma
  orderItems      OrderItem[]
```

- [ ] **Step 3: Generate and apply the migration**

Start the local database in the background and leave it running:

```bash
pnpm db:local
```

Baseline it first — on a fresh checkout the local database has no migration
history, and `migrate diff` would otherwise return the entire schema:

```bash
pnpm prisma:deploy
```

Then produce the delta:

```bash
DATABASE_URL="postgresql://postgres:postgres@localhost:55432/postgres?pgbouncer=true&connection_limit=1" \
  npx prisma migrate diff \
  --from-schema-datasource prisma/schema.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script > ./phase7c-diff.sql
```

Expected: five `CREATE TYPE` statements and four `CREATE TABLE` statements with
their foreign keys and indexes. **Nothing destructive.** If any `DROP` against an
existing table or column appears, stop and report it rather than applying it.

Create `prisma/migrations/<YYYYMMDDHHmmss>_phase7c_orders/migration.sql` with
that SQL — timestamp later than `20260720000000` — matching the formatting of
`prisma/migrations/20260720000000_phase6_pdf_generation/migration.sql`. Then:

```bash
pnpm prisma:deploy
pnpm prisma:generate
rm -f ./phase7c-diff.sql
```

Expected: both exit 0; `@prisma/client` now exports `Order`, `OrderItem`,
`OrderEvent`, `OrderNote` and the five enums.

- [ ] **Step 4: Verify and commit**

```bash
pnpm typecheck
```

Expected: exits 0.

```bash
pnpm test
```

Expected: 468 passing, unchanged.

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(orders): add Order, OrderItem, OrderEvent and OrderNote

Splits Ph7.md's 13-state chain into a commercial OrderStatus and a
per-deliverable OrderItemStatus. One enum would leave an order sitting in
Print Production while its website half is untouched.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 2: `services/orders/types.ts` and `status.ts`

**Files:**
- Create: `services/orders/types.ts`
- Create: `services/orders/status.ts`
- Test: `services/orders/status.test.ts`

The transition tables. Pure — no Prisma import — so every rule is unit-testable
without a database.

**Interfaces:**
- Produces: `ORDER_TRANSITIONS`, `ITEM_TRANSITIONS`, `canTransitionOrder(from, to)`,
  `canTransitionItem(from, to)`, `isTerminalOrder(s)`, `isTerminalItem(s)`,
  `TransitionError` — consumed by Tasks 3, 5, 9.

- [ ] **Step 1: Write `types.ts`**

```typescript
/**
 * Shared order types. Deliberately no Prisma import: the transition rules and
 * the board grouping must be testable without a database, and mirroring the
 * enums as string unions is what allows that.
 *
 * These unions must match prisma/schema.prisma exactly. A value here that the
 * database does not have is a runtime failure no type-checker will catch.
 */

export type OrderStatusValue =
  | "INQUIRY"
  | "QUOTATION"
  | "CONFIRMED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "ARCHIVED"
  | "CANCELLED";

export type OrderItemStatusValue =
  | "PENDING"
  | "DRAFT_CREATION"
  | "CUSTOMER_REVIEW"
  | "REVISION"
  | "APPROVED"
  | "IN_PRODUCTION"
  | "QUALITY_CHECK"
  | "READY_FOR_RELEASE"
  | "COMPLETED"
  | "CANCELLED";

export type OrderItemKindValue =
  | "INVITATION_PRINT"
  | "WEBSITE"
  | "REPRINT"
  | "OTHER";

export type PriorityValue = "LOW" | "NORMAL" | "HIGH" | "URGENT";

/** Highest first — the board sorts on this. */
export const PRIORITY_ORDER: Record<PriorityValue, number> = {
  URGENT: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
};
```

- [ ] **Step 2: Write the failing test**

Create `services/orders/status.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  ORDER_TRANSITIONS,
  ITEM_TRANSITIONS,
  canTransitionOrder,
  canTransitionItem,
  isTerminalOrder,
  isTerminalItem,
} from "./status";
import type { OrderStatusValue, OrderItemStatusValue } from "./types";

describe("order transitions", () => {
  it("allows the documented forward path", () => {
    expect(canTransitionOrder("INQUIRY", "QUOTATION")).toBe(true);
    expect(canTransitionOrder("QUOTATION", "CONFIRMED")).toBe(true);
    expect(canTransitionOrder("CONFIRMED", "IN_PROGRESS")).toBe(true);
    expect(canTransitionOrder("IN_PROGRESS", "COMPLETED")).toBe(true);
    expect(canTransitionOrder("COMPLETED", "ARCHIVED")).toBe(true);
  });

  it("rejects skipping straight from inquiry to completed", () => {
    expect(canTransitionOrder("INQUIRY", "COMPLETED")).toBe(false);
  });

  it("rejects moving backwards", () => {
    expect(canTransitionOrder("CONFIRMED", "INQUIRY")).toBe(false);
  });

  it("allows cancelling from any non-terminal state", () => {
    for (const from of [
      "INQUIRY",
      "QUOTATION",
      "CONFIRMED",
      "IN_PROGRESS",
    ] as OrderStatusValue[]) {
      expect(canTransitionOrder(from, "CANCELLED")).toBe(true);
    }
  });

  it("lets nothing out of a terminal state", () => {
    for (const terminal of [
      "COMPLETED",
      "ARCHIVED",
      "CANCELLED",
    ] as OrderStatusValue[]) {
      if (terminal === "COMPLETED") continue; // COMPLETED -> ARCHIVED is legal
      for (const to of Object.keys(ORDER_TRANSITIONS) as OrderStatusValue[]) {
        expect(canTransitionOrder(terminal, to)).toBe(false);
      }
    }
  });

  it("treats a status as unable to transition to itself", () => {
    expect(canTransitionOrder("CONFIRMED", "CONFIRMED")).toBe(false);
  });

  it("reports terminal states", () => {
    expect(isTerminalOrder("ARCHIVED")).toBe(true);
    expect(isTerminalOrder("CANCELLED")).toBe(true);
    expect(isTerminalOrder("IN_PROGRESS")).toBe(false);
  });
});

describe("item transitions", () => {
  it("allows the documented production path", () => {
    expect(canTransitionItem("PENDING", "DRAFT_CREATION")).toBe(true);
    expect(canTransitionItem("DRAFT_CREATION", "CUSTOMER_REVIEW")).toBe(true);
    expect(canTransitionItem("CUSTOMER_REVIEW", "APPROVED")).toBe(true);
    expect(canTransitionItem("APPROVED", "IN_PRODUCTION")).toBe(true);
    expect(canTransitionItem("IN_PRODUCTION", "QUALITY_CHECK")).toBe(true);
    expect(canTransitionItem("QUALITY_CHECK", "READY_FOR_RELEASE")).toBe(true);
    expect(canTransitionItem("READY_FOR_RELEASE", "COMPLETED")).toBe(true);
  });

  it("sends a review rejection to REVISION and back to drafting", () => {
    expect(canTransitionItem("CUSTOMER_REVIEW", "REVISION")).toBe(true);
    expect(canTransitionItem("REVISION", "DRAFT_CREATION")).toBe(true);
  });

  it("lets quality check send work back into production", () => {
    expect(canTransitionItem("QUALITY_CHECK", "IN_PRODUCTION")).toBe(true);
  });

  it("rejects jumping past quality check", () => {
    expect(canTransitionItem("IN_PRODUCTION", "COMPLETED")).toBe(false);
  });

  it("rejects producing something that was never approved", () => {
    expect(canTransitionItem("CUSTOMER_REVIEW", "IN_PRODUCTION")).toBe(false);
  });

  it("allows cancelling from any non-terminal state", () => {
    for (const from of [
      "PENDING",
      "DRAFT_CREATION",
      "CUSTOMER_REVIEW",
      "REVISION",
      "APPROVED",
      "IN_PRODUCTION",
      "QUALITY_CHECK",
      "READY_FOR_RELEASE",
    ] as OrderItemStatusValue[]) {
      expect(canTransitionItem(from, "CANCELLED")).toBe(true);
    }
  });

  it("lets nothing out of a terminal state", () => {
    for (const terminal of ["COMPLETED", "CANCELLED"] as OrderItemStatusValue[]) {
      for (const to of Object.keys(ITEM_TRANSITIONS) as OrderItemStatusValue[]) {
        expect(canTransitionItem(terminal, to)).toBe(false);
      }
    }
    expect(isTerminalItem("COMPLETED")).toBe(true);
    expect(isTerminalItem("PENDING")).toBe(false);
  });

  it("defines an entry for every status, so no status is a dead end by omission", () => {
    const all: OrderItemStatusValue[] = [
      "PENDING",
      "DRAFT_CREATION",
      "CUSTOMER_REVIEW",
      "REVISION",
      "APPROVED",
      "IN_PRODUCTION",
      "QUALITY_CHECK",
      "READY_FOR_RELEASE",
      "COMPLETED",
      "CANCELLED",
    ];
    for (const status of all) {
      expect(ITEM_TRANSITIONS[status]).toBeDefined();
    }
  });
});
```

- [ ] **Step 3: Run it and confirm it fails**

```bash
npx vitest run services/orders/status.test.ts
```

Expected: FAIL — `Cannot find module './status'`.

- [ ] **Step 4: Write `status.ts`**

```typescript
import type { OrderStatusValue, OrderItemStatusValue } from "./types";

/**
 * Transition rules — Ph7.md §2 ("status transitions must be controlled and
 * auditable"). This module is the controlled half; OrderEvent is the auditable
 * half.
 *
 * A table rather than conditionals scattered across actions: the legal moves
 * are then a single readable thing, every rejection is testable, and adding a
 * state cannot silently leave a hole somewhere else in the codebase.
 *
 * A status maps to the set of statuses it may move to. An empty array means
 * terminal.
 */

export const ORDER_TRANSITIONS: Record<
  OrderStatusValue,
  readonly OrderStatusValue[]
> = {
  INQUIRY: ["QUOTATION", "CANCELLED"],
  QUOTATION: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  // Archiving is the only move out of COMPLETED: an order that is done can be
  // filed away, but never reopened. Reopening would break the audit trail's
  // meaning — the history says it finished.
  COMPLETED: ["ARCHIVED"],
  ARCHIVED: [],
  CANCELLED: [],
};

export const ITEM_TRANSITIONS: Record<
  OrderItemStatusValue,
  readonly OrderItemStatusValue[]
> = {
  PENDING: ["DRAFT_CREATION", "CANCELLED"],
  DRAFT_CREATION: ["CUSTOMER_REVIEW", "CANCELLED"],
  CUSTOMER_REVIEW: ["APPROVED", "REVISION", "CANCELLED"],
  REVISION: ["DRAFT_CREATION", "CANCELLED"],
  APPROVED: ["IN_PRODUCTION", "CANCELLED"],
  IN_PRODUCTION: ["QUALITY_CHECK", "CANCELLED"],
  // Quality check can send work back to the press. That is the whole point of
  // having a quality check.
  QUALITY_CHECK: ["READY_FOR_RELEASE", "IN_PRODUCTION", "CANCELLED"],
  READY_FOR_RELEASE: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransitionOrder(
  from: OrderStatusValue,
  to: OrderStatusValue,
): boolean {
  return ORDER_TRANSITIONS[from].includes(to);
}

export function canTransitionItem(
  from: OrderItemStatusValue,
  to: OrderItemStatusValue,
): boolean {
  return ITEM_TRANSITIONS[from].includes(to);
}

export function isTerminalOrder(status: OrderStatusValue): boolean {
  return ORDER_TRANSITIONS[status].length === 0;
}

export function isTerminalItem(status: OrderItemStatusValue): boolean {
  return ITEM_TRANSITIONS[status].length === 0;
}

/**
 * Thrown when a caller attempts an illegal move. Carries both statuses so the
 * message says what was actually attempted rather than "invalid transition".
 */
export class TransitionError extends Error {
  constructor(
    public readonly from: string,
    public readonly to: string,
  ) {
    super(`Cannot move from ${from} to ${to}.`);
    this.name = "TransitionError";
  }
}
```

- [ ] **Step 5: Run it and confirm it passes**

```bash
npx vitest run services/orders/status.test.ts
```

Expected: PASS — 14 tests.

- [ ] **Step 6: Type-check and commit**

```bash
pnpm typecheck
```

Expected: exits 0.

```bash
git add services/orders/types.ts services/orders/status.ts services/orders/status.test.ts
git commit -m "feat(orders): add transition tables for orders and items

A table rather than conditionals spread across actions: the legal moves
are one readable thing, every rejection is testable, and adding a state
cannot silently leave a hole elsewhere.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 3: `services/orders/derive.ts`

**Files:**
- Create: `services/orders/derive.ts`
- Test: `services/orders/derive.test.ts`

An order's status follows its items (spec, "Transitions"). Pure, so every
combination is testable.

**Interfaces:**
- Consumes: `OrderStatusValue`, `OrderItemStatusValue` (Task 2).
- Produces: `deriveOrderStatus(current, itemStatuses): OrderStatusValue | null` —
  consumed by Task 5.

- [ ] **Step 1: Write the failing test**

Create `services/orders/derive.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { deriveOrderStatus } from "./derive";

describe("deriveOrderStatus", () => {
  it("returns null when nothing should change", () => {
    expect(deriveOrderStatus("IN_PROGRESS", ["DRAFT_CREATION"])).toBeNull();
  });

  it("moves a confirmed order to in-progress once work starts", () => {
    expect(deriveOrderStatus("CONFIRMED", ["DRAFT_CREATION"])).toBe(
      "IN_PROGRESS",
    );
  });

  it("leaves a confirmed order alone while every item is still pending", () => {
    expect(deriveOrderStatus("CONFIRMED", ["PENDING", "PENDING"])).toBeNull();
  });

  it("completes an order once every item is complete", () => {
    expect(deriveOrderStatus("IN_PROGRESS", ["COMPLETED", "COMPLETED"])).toBe(
      "COMPLETED",
    );
  });

  it("treats cancelled items as not blocking completion", () => {
    expect(deriveOrderStatus("IN_PROGRESS", ["COMPLETED", "CANCELLED"])).toBe(
      "COMPLETED",
    );
  });

  it("does not complete an order while any item is still in flight", () => {
    expect(
      deriveOrderStatus("IN_PROGRESS", ["COMPLETED", "QUALITY_CHECK"]),
    ).toBeNull();
  });

  it("does not complete an order with no items at all", () => {
    // An order with nothing on it is not a finished order — it is an empty one.
    expect(deriveOrderStatus("IN_PROGRESS", [])).toBeNull();
  });

  it("does not complete an order whose every item was cancelled", () => {
    // Everything cancelled means the job was called off, not delivered.
    expect(
      deriveOrderStatus("IN_PROGRESS", ["CANCELLED", "CANCELLED"]),
    ).toBeNull();
  });

  it("never resurrects a terminal order", () => {
    expect(deriveOrderStatus("CANCELLED", ["COMPLETED"])).toBeNull();
    expect(deriveOrderStatus("ARCHIVED", ["COMPLETED"])).toBeNull();
    expect(deriveOrderStatus("COMPLETED", ["IN_PRODUCTION"])).toBeNull();
  });

  it("never derives a move the transition table forbids", () => {
    // INQUIRY -> IN_PROGRESS is not a legal edge, so starting work on an item
    // of an un-quoted order must not silently advance it.
    expect(deriveOrderStatus("INQUIRY", ["DRAFT_CREATION"])).toBeNull();
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
npx vitest run services/orders/derive.test.ts
```

Expected: FAIL — `Cannot find module './derive'`.

- [ ] **Step 3: Write `derive.ts`**

```typescript
import type { OrderStatusValue, OrderItemStatusValue } from "./types";
import { canTransitionOrder } from "./status";

/**
 * An order's status follows its items, so nobody has to maintain it by hand —
 * spec, "Transitions". Derived on write rather than by a background job: a
 * board that shows yesterday's truth is worse than one that shows none.
 *
 * Returns the status to move to, or null to leave it alone. Returning null
 * rather than the current status keeps the caller's intent obvious: null means
 * "write nothing", which also means "write no audit event".
 *
 * Every derived move is checked against the same transition table a human move
 * goes through. A derivation that bypassed the rules would be a second, quieter
 * way to reach an illegal state.
 */
export function deriveOrderStatus(
  current: OrderStatusValue,
  itemStatuses: readonly OrderItemStatusValue[],
): OrderStatusValue | null {
  const propose = (next: OrderStatusValue): OrderStatusValue | null =>
    canTransitionOrder(current, next) ? next : null;

  if (itemStatuses.length === 0) return null;

  const live = itemStatuses.filter((s) => s !== "CANCELLED");

  // Everything cancelled: the job was called off, not delivered. Cancelling the
  // order itself is a decision a person makes, not one derived from items.
  if (live.length === 0) return null;

  if (live.every((s) => s === "COMPLETED")) return propose("COMPLETED");

  // Work has started the moment any item leaves PENDING.
  if (live.some((s) => s !== "PENDING")) return propose("IN_PROGRESS");

  return null;
}
```

- [ ] **Step 4: Run it and confirm it passes**

```bash
npx vitest run services/orders/derive.test.ts
```

Expected: PASS — 10 tests.

- [ ] **Step 5: Commit**

```bash
pnpm typecheck
```

Expected: exits 0.

```bash
git add services/orders/derive.ts services/orders/derive.test.ts
git commit -m "feat(orders): derive order status from its items

Checked against the same transition table a human move goes through --
a derivation that bypassed the rules would be a second, quieter way to
reach an illegal state.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 4: `services/orders/reference.ts`

**Files:**
- Create: `services/orders/reference.ts`
- Test: `services/orders/reference.test.ts`

Human-facing booking IDs. Pure — the caller supplies the highest existing
reference, so numbering is testable without a database.

**Interfaces:**
- Produces: `formatReference(year, sequence)`, `parseReference(ref)`,
  `nextReference(year, highestExisting)` — consumed by Task 5.

- [ ] **Step 1: Write the failing test**

Create `services/orders/reference.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import {
  formatReference,
  parseReference,
  nextReference,
} from "./reference";

describe("formatReference", () => {
  it("pads the sequence to four digits", () => {
    expect(formatReference(2026, 42)).toBe("ML-2026-0042");
    expect(formatReference(2026, 1)).toBe("ML-2026-0001");
  });

  it("does not truncate a sequence past four digits", () => {
    expect(formatReference(2026, 12345)).toBe("ML-2026-12345");
  });
});

describe("parseReference", () => {
  it("reads back a formatted reference", () => {
    expect(parseReference("ML-2026-0042")).toEqual({
      year: 2026,
      sequence: 42,
    });
  });

  it("returns null for anything that is not one", () => {
    expect(parseReference("")).toBeNull();
    expect(parseReference("2026-0042")).toBeNull();
    expect(parseReference("ML-2026")).toBeNull();
    expect(parseReference("ML-abcd-0042")).toBeNull();
  });
});

describe("nextReference", () => {
  it("starts at one when the year has no orders yet", () => {
    expect(nextReference(2026, null)).toBe("ML-2026-0001");
  });

  it("increments from the highest existing reference", () => {
    expect(nextReference(2026, "ML-2026-0042")).toBe("ML-2026-0043");
  });

  it("restarts the sequence in a new year", () => {
    expect(nextReference(2027, "ML-2026-0900")).toBe("ML-2027-0001");
  });

  it("ignores an unparseable existing reference rather than crashing", () => {
    expect(nextReference(2026, "garbage")).toBe("ML-2026-0001");
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
npx vitest run services/orders/reference.test.ts
```

Expected: FAIL — `Cannot find module './reference'`.

- [ ] **Step 3: Write `reference.ts`**

```typescript
/**
 * Human-facing booking IDs — "ML-2026-0042".
 *
 * Pure: the caller passes in the highest reference already issued for the year,
 * so the numbering rule is testable without a database.
 *
 * The sequence comes from the highest existing reference, never a row count. A
 * count hands the same number out twice the first time an order is deleted, and
 * a duplicated booking ID is the kind of thing that is only noticed when two
 * customers are quoted under it.
 */

const PATTERN = /^ML-(\d{4})-(\d+)$/;

export function formatReference(year: number, sequence: number): string {
  return `ML-${year}-${String(sequence).padStart(4, "0")}`;
}

export function parseReference(
  reference: string,
): { year: number; sequence: number } | null {
  const match = PATTERN.exec(reference);
  if (!match) return null;
  return { year: Number(match[1]), sequence: Number(match[2]) };
}

export function nextReference(
  year: number,
  highestExisting: string | null,
): string {
  const parsed = highestExisting ? parseReference(highestExisting) : null;

  // A reference from an earlier year does not carry over — the sequence
  // restarts each January.
  if (!parsed || parsed.year !== year) return formatReference(year, 1);

  return formatReference(year, parsed.sequence + 1);
}
```

- [ ] **Step 4: Run it and confirm it passes**

```bash
npx vitest run services/orders/reference.test.ts
```

Expected: PASS — 9 tests.

- [ ] **Step 5: Commit**

```bash
pnpm typecheck
```

Expected: exits 0.

```bash
git add services/orders/reference.ts services/orders/reference.test.ts
git commit -m "feat(orders): generate ML-YYYY-NNNN booking references

Sequence derives from the highest existing reference, never a row count:
a count hands the same number out twice the first time an order is
deleted.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 5: `lib/auth/require-staff.ts`

**Files:**
- Create: `lib/auth/require-staff.ts`
- Test: `lib/auth/require-staff.test.ts`

**Interfaces:**
- Consumes: `SessionProfile` and `getProfile` from `@/lib/auth/session`.
- Produces: `isStaff(profile)`, `requireStaff()` — consumed by Tasks 7, 9, 10.

`SessionProfile` already carries `role`, so this is a guard over the existing
session, not a new query.

- [ ] **Step 1: Write the failing test**

Create `lib/auth/require-staff.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { isStaff } from "./require-staff";

describe("isStaff", () => {
  it("accepts admins and staff", () => {
    expect(isStaff({ role: "ADMIN" })).toBe(true);
    expect(isStaff({ role: "STAFF" })).toBe(true);
  });

  it("rejects customers", () => {
    expect(isStaff({ role: "CUSTOMER" })).toBe(false);
  });

  it("rejects a missing profile", () => {
    expect(isStaff(null)).toBe(false);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
npx vitest run lib/auth/require-staff.test.ts
```

Expected: FAIL — `Cannot find module './require-staff'`.

- [ ] **Step 3: Write `require-staff.ts`**

```typescript
import { notFound } from "next/navigation";
import { getProfile, type SessionProfile } from "./session";

/**
 * Staff access gate — Phase 7c.
 *
 * Takes the narrowest possible shape rather than a full SessionProfile so the
 * rule itself is testable without constructing a session.
 */
export function isStaff(
  profile: Pick<SessionProfile, "role"> | null,
): boolean {
  return profile?.role === "ADMIN" || profile?.role === "STAFF";
}

/**
 * The profile, if it belongs to staff. Otherwise 404 — never a redirect.
 *
 * A redirect to sign-in tells an unauthenticated stranger that the page exists,
 * and a redirect to the dashboard tells a signed-in customer the same thing.
 * The internal production surfaces should be indistinguishable from URLs that
 * were never routed.
 *
 * Call this in Server Actions too, not only in page loads: an action is
 * reachable by POST regardless of what was rendered.
 */
export async function requireStaff(): Promise<SessionProfile> {
  const profile = await getProfile();
  if (!isStaff(profile)) notFound();
  return profile as SessionProfile;
}
```

- [ ] **Step 4: Run it and confirm it passes**

```bash
npx vitest run lib/auth/require-staff.test.ts
```

Expected: PASS — 3 tests.

- [ ] **Step 5: Commit**

```bash
pnpm typecheck
```

Expected: exits 0.

```bash
git add lib/auth/require-staff.ts lib/auth/require-staff.test.ts
git commit -m "feat(auth): add the staff access gate

404 rather than redirect: a redirect to sign-in tells a stranger the page
exists, and a redirect to the dashboard tells a customer the same.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 6: `services/orders/repository.ts` and `index.ts`

**Files:**
- Create: `services/orders/repository.ts`
- Create: `services/orders/index.ts`

Persistence. No test file — thin Prisma wrappers, matching the convention in
`services/media` and `services/pdf`. The rules they enforce are already tested in
Tasks 2–4.

**Interfaces:**
- Consumes: `prisma`, `isDatabaseConfigured` (`@/lib/db`), `logger`, Tasks 1–4.
- Produces: `OrderRow`, `OrderItemRow`, `BoardItem`, `listBoardItems`,
  `listOrders`, `getOrder`, `createOrder`, `addItem`, `moveItem`, `moveOrder`,
  `assignItem`, `addNote` — consumed by Tasks 7, 8, 9, 10.

- [ ] **Step 1: Write `repository.ts`**

```typescript
import "server-only";

import type { Prisma, Order, OrderItem } from "@prisma/client";
import { prisma, isDatabaseConfigured } from "@/lib/db";
import { logger } from "@/lib/logger";
import type {
  OrderStatusValue,
  OrderItemStatusValue,
  OrderItemKindValue,
  PriorityValue,
} from "./types";
import { canTransitionOrder, canTransitionItem, TransitionError } from "./status";
import { deriveOrderStatus } from "./derive";
import { nextReference } from "./reference";

/**
 * Order persistence — Ph7.md §1, §2, §12.
 *
 * Every status change and its audit row are written in ONE transaction. A
 * status that moved without leaving a trace is the exact failure this phase
 * exists to prevent, so it must not be reachable, not merely discouraged.
 *
 * These functions are staff-facing and assume the caller has already passed
 * requireStaff(). They do not re-check the role: the gate belongs at the entry
 * point, and duplicating it here would imply the entry point is optional.
 */

export type OrderRow = Order;
export type OrderItemRow = OrderItem;

const BOARD_INCLUDE = {
  order: {
    select: {
      id: true,
      reference: true,
      dueDate: true,
      profile: { select: { id: true, displayName: true, email: true } },
      invitation: { select: { id: true, title: true } },
    },
  },
  assignedTo: { select: { id: true, displayName: true, email: true } },
} satisfies Prisma.OrderItemInclude;

export type BoardItem = Prisma.OrderItemGetPayload<{
  include: typeof BOARD_INCLUDE;
}>;

/** Everything currently on the production board — Ph7.md §4, §10. */
export async function listBoardItems(): Promise<BoardItem[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    return await prisma.orderItem.findMany({
      // Finished and abandoned work leaves the board. It stays on the order.
      where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
      include: BOARD_INCLUDE,
      orderBy: [{ priority: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
    });
  } catch (error) {
    logger.report(error, { at: "listBoardItems" });
    return [];
  }
}

const ORDER_INCLUDE = {
  profile: { select: { id: true, displayName: true, email: true } },
  assignedTo: { select: { id: true, displayName: true } },
  invitation: { select: { id: true, title: true } },
  items: { orderBy: { createdAt: "asc" } },
} satisfies Prisma.OrderInclude;

export type OrderWithItems = Prisma.OrderGetPayload<{
  include: typeof ORDER_INCLUDE;
}>;

export async function listOrders(): Promise<OrderWithItems[]> {
  if (!isDatabaseConfigured()) return [];

  try {
    return await prisma.order.findMany({
      include: ORDER_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
  } catch (error) {
    logger.report(error, { at: "listOrders" });
    return [];
  }
}

export async function getOrder(id: string): Promise<OrderWithItems | null> {
  if (!isDatabaseConfigured()) return null;

  try {
    return await prisma.order.findUnique({ where: { id }, include: ORDER_INCLUDE });
  } catch (error) {
    logger.report(error, { at: "getOrder", id });
    return null;
  }
}

export interface CreateOrderInput {
  profileId: string;
  invitationId: string | null;
  actorId: string;
}

/** Creates an order with the next reference for the current year. */
export async function createOrder(
  input: CreateOrderInput,
): Promise<OrderRow | null> {
  if (!isDatabaseConfigured()) return null;

  const year = new Date().getFullYear();

  try {
    return await prisma.$transaction(async (tx) => {
      const highest = await tx.order.findFirst({
        where: { reference: { startsWith: `ML-${year}-` } },
        orderBy: { reference: "desc" },
        select: { reference: true },
      });

      const order = await tx.order.create({
        data: {
          profileId: input.profileId,
          invitationId: input.invitationId,
          reference: nextReference(year, highest?.reference ?? null),
          status: "INQUIRY",
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          actorId: input.actorId,
          type: "STATUS_CHANGE",
          toStatus: "INQUIRY",
          message: `Order ${order.reference} created.`,
        },
      });

      return order;
    });
  } catch (error) {
    logger.report(error, { at: "createOrder", profileId: input.profileId });
    return null;
  }
}

export interface AddItemInput {
  orderId: string;
  kind: OrderItemKindValue;
  quantity: number;
  priority: PriorityValue;
  actorId: string;
}

export async function addItem(input: AddItemInput): Promise<OrderItemRow | null> {
  if (!isDatabaseConfigured()) return null;

  try {
    return await prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.create({
        data: {
          orderId: input.orderId,
          kind: input.kind,
          quantity: input.quantity,
          priority: input.priority,
          status: "PENDING",
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId: input.orderId,
          orderItemId: item.id,
          actorId: input.actorId,
          type: "ITEM_ADDED",
          toStatus: "PENDING",
          message: `Added ${input.kind}.`,
        },
      });

      return item;
    });
  } catch (error) {
    logger.report(error, { at: "addItem", orderId: input.orderId });
    return null;
  }
}

export type MoveResult =
  | { ok: true }
  | { ok: false; message: string };

/**
 * Moves an item, writes its audit row, and lets the order's own status follow —
 * all in one transaction. The derived order move is checked against the same
 * table a human move goes through and gets its own audit row, so the history
 * explains why the order advanced.
 */
export async function moveItem(
  itemId: string,
  to: OrderItemStatusValue,
  actorId: string,
): Promise<MoveResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, message: "The database is not configured." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.findUnique({
        where: { id: itemId },
        select: { id: true, orderId: true, status: true },
      });
      if (!item) throw new Error("not-found");

      const from = item.status as OrderItemStatusValue;
      if (!canTransitionItem(from, to)) throw new TransitionError(from, to);

      await tx.orderItem.update({ where: { id: itemId }, data: { status: to } });
      await tx.orderEvent.create({
        data: {
          orderId: item.orderId,
          orderItemId: item.id,
          actorId,
          type: "STATUS_CHANGE",
          fromStatus: from,
          toStatus: to,
        },
      });

      const order = await tx.order.findUnique({
        where: { id: item.orderId },
        select: { status: true, items: { select: { status: true } } },
      });
      if (!order) return;

      const derived = deriveOrderStatus(
        order.status as OrderStatusValue,
        order.items.map((i) => i.status as OrderItemStatusValue),
      );
      if (!derived) return;

      await tx.order.update({
        where: { id: item.orderId },
        data: { status: derived },
      });
      await tx.orderEvent.create({
        data: {
          orderId: item.orderId,
          actorId: null,
          type: "STATUS_CHANGE",
          fromStatus: order.status,
          toStatus: derived,
          message: "Followed its items.",
        },
      });
    });

    return { ok: true };
  } catch (error) {
    if (error instanceof TransitionError) {
      return { ok: false, message: error.message };
    }
    logger.report(error, { at: "moveItem", itemId });
    return { ok: false, message: "Could not move that item. Try again." };
  }
}

/** A staff-initiated move of the order itself, e.g. Inquiry to Quotation. */
export async function moveOrder(
  orderId: string,
  to: OrderStatusValue,
  actorId: string,
): Promise<MoveResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, message: "The database is not configured." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id: orderId },
        select: { status: true },
      });
      if (!order) throw new Error("not-found");

      const from = order.status as OrderStatusValue;
      if (!canTransitionOrder(from, to)) throw new TransitionError(from, to);

      await tx.order.update({ where: { id: orderId }, data: { status: to } });
      await tx.orderEvent.create({
        data: {
          orderId,
          actorId,
          type: "STATUS_CHANGE",
          fromStatus: from,
          toStatus: to,
        },
      });
    });

    return { ok: true };
  } catch (error) {
    if (error instanceof TransitionError) {
      return { ok: false, message: error.message };
    }
    logger.report(error, { at: "moveOrder", orderId });
    return { ok: false, message: "Could not update that order. Try again." };
  }
}

export async function assignItem(
  itemId: string,
  assigneeId: string | null,
  actorId: string,
): Promise<MoveResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, message: "The database is not configured." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const item = await tx.orderItem.update({
        where: { id: itemId },
        data: { assignedToId: assigneeId },
        select: { orderId: true },
      });

      await tx.orderEvent.create({
        data: {
          orderId: item.orderId,
          orderItemId: itemId,
          actorId,
          type: "ASSIGNED",
          message: assigneeId ? "Assigned." : "Unassigned.",
        },
      });
    });

    return { ok: true };
  } catch (error) {
    logger.report(error, { at: "assignItem", itemId });
    return { ok: false, message: "Could not assign that item. Try again." };
  }
}

/** Staff-only note — Ph7.md §8. Never shown to a customer. */
export async function addNote(
  orderId: string,
  authorId: string,
  body: string,
): Promise<MoveResult> {
  if (!isDatabaseConfigured()) {
    return { ok: false, message: "The database is not configured." };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.orderNote.create({ data: { orderId, authorId, body } });
      await tx.orderEvent.create({
        data: { orderId, actorId: authorId, type: "NOTE_ADDED" },
      });
    });

    return { ok: true };
  } catch (error) {
    logger.report(error, { at: "addNote", orderId });
    return { ok: false, message: "Could not save that note. Try again." };
  }
}
```

- [ ] **Step 2: Write `index.ts`**

```typescript
import "server-only";

/**
 * Order engine — the public surface. Nothing outside this folder imports
 * services/orders/* by its internal path.
 */

export type {
  OrderStatusValue,
  OrderItemStatusValue,
  OrderItemKindValue,
  PriorityValue,
} from "./types";
export { PRIORITY_ORDER } from "./types";
export {
  ORDER_TRANSITIONS,
  ITEM_TRANSITIONS,
  canTransitionOrder,
  canTransitionItem,
  isTerminalOrder,
  isTerminalItem,
  TransitionError,
} from "./status";
export { deriveOrderStatus } from "./derive";
export { formatReference, parseReference, nextReference } from "./reference";
export type {
  OrderRow,
  OrderItemRow,
  BoardItem,
  OrderWithItems,
  CreateOrderInput,
  AddItemInput,
  MoveResult,
} from "./repository";
export {
  listBoardItems,
  listOrders,
  getOrder,
  createOrder,
  addItem,
  moveItem,
  moveOrder,
  assignItem,
  addNote,
} from "./repository";
```

- [ ] **Step 3: Verify and commit**

```bash
pnpm typecheck
```

Expected: exits 0.

```bash
pnpm test
```

Expected: still passing, count unchanged from Task 5.

```bash
git add services/orders/repository.ts services/orders/index.ts
git commit -m "feat(orders): persist orders, items, transitions and notes

Every status change and its audit row are written in one transaction: a
status that moved without leaving a trace is the failure this phase
exists to prevent, so it must not be reachable.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 7: `features/production/board.ts`

**Files:**
- Create: `features/production/board.ts`
- Test: `features/production/board.test.ts`

Grouping items into columns. Pure, so column membership and ordering are testable
without rendering anything.

**Interfaces:**
- Consumes: `OrderItemStatusValue`, `PriorityValue`, `PRIORITY_ORDER` (`@/services/orders`).
- Produces: `BOARD_COLUMNS`, `COLUMN_LABELS`, `groupIntoColumns(items)`,
  `sortForBoard(items)` — consumed by Tasks 8, 9.

- [ ] **Step 1: Write the failing test**

Create `features/production/board.test.ts`:

```typescript
import { describe, expect, it } from "vitest";
import { BOARD_COLUMNS, groupIntoColumns, sortForBoard } from "./board";

type Item = Parameters<typeof sortForBoard>[0][number];

function item(over: Partial<Item> = {}): Item {
  return {
    id: "i1",
    status: "PENDING",
    priority: "NORMAL",
    dueDate: null,
    ...over,
  } as Item;
}

describe("BOARD_COLUMNS", () => {
  it("does not show finished or abandoned work", () => {
    expect(BOARD_COLUMNS).not.toContain("COMPLETED");
    expect(BOARD_COLUMNS).not.toContain("CANCELLED");
  });

  it("runs in production order", () => {
    expect(BOARD_COLUMNS[0]).toBe("PENDING");
    expect(BOARD_COLUMNS[BOARD_COLUMNS.length - 1]).toBe("READY_FOR_RELEASE");
  });
});

describe("groupIntoColumns", () => {
  it("returns an entry for every column, even empty ones", () => {
    const grouped = groupIntoColumns([]);
    for (const column of BOARD_COLUMNS) {
      expect(grouped[column]).toEqual([]);
    }
  });

  it("files each item under its own status", () => {
    const grouped = groupIntoColumns([
      item({ id: "a", status: "PENDING" }),
      item({ id: "b", status: "IN_PRODUCTION" }),
    ]);
    expect(grouped.PENDING.map((i) => i.id)).toEqual(["a"]);
    expect(grouped.IN_PRODUCTION.map((i) => i.id)).toEqual(["b"]);
  });

  it("drops items whose status is not a board column", () => {
    // A completed item is not board work. Silently binning it beats crashing
    // the whole board over one row.
    const grouped = groupIntoColumns([item({ id: "done", status: "COMPLETED" })]);
    for (const column of BOARD_COLUMNS) {
      expect(grouped[column]).toEqual([]);
    }
  });
});

describe("sortForBoard", () => {
  it("puts urgent work first", () => {
    const sorted = sortForBoard([
      item({ id: "low", priority: "LOW" }),
      item({ id: "urgent", priority: "URGENT" }),
      item({ id: "normal", priority: "NORMAL" }),
    ]);
    expect(sorted.map((i) => i.id)).toEqual(["urgent", "normal", "low"]);
  });

  it("breaks ties on the earlier due date", () => {
    const sorted = sortForBoard([
      item({ id: "later", dueDate: new Date("2027-03-20") }),
      item({ id: "sooner", dueDate: new Date("2027-03-14") }),
    ]);
    expect(sorted.map((i) => i.id)).toEqual(["sooner", "later"]);
  });

  it("puts undated work after dated work at the same priority", () => {
    // Something with a deadline outranks something without one.
    const sorted = sortForBoard([
      item({ id: "undated", dueDate: null }),
      item({ id: "dated", dueDate: new Date("2027-03-14") }),
    ]);
    expect(sorted.map((i) => i.id)).toEqual(["dated", "undated"]);
  });

  it("does not mutate the array it was given", () => {
    const input = [
      item({ id: "low", priority: "LOW" }),
      item({ id: "urgent", priority: "URGENT" }),
    ];
    sortForBoard(input);
    expect(input.map((i) => i.id)).toEqual(["low", "urgent"]);
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

```bash
npx vitest run features/production/board.test.ts
```

Expected: FAIL — `Cannot find module './board'`.

- [ ] **Step 3: Write `board.ts`**

```typescript
import {
  PRIORITY_ORDER,
  type OrderItemStatusValue,
  type PriorityValue,
} from "@/services/orders";

/**
 * Board shape — Ph7.md §4, §10.
 *
 * Pure, and deliberately structural rather than visual: column membership and
 * ordering are decisions worth testing, and testing them through a rendered
 * component would be slower and prove less.
 */

/**
 * COMPLETED and CANCELLED are absent on purpose. The board is a queue of work
 * to do; finished and abandoned items belong to the order's history, and
 * leaving them here would grow a column nobody ever clears.
 */
export const BOARD_COLUMNS = [
  "PENDING",
  "DRAFT_CREATION",
  "CUSTOMER_REVIEW",
  "REVISION",
  "APPROVED",
  "IN_PRODUCTION",
  "QUALITY_CHECK",
  "READY_FOR_RELEASE",
] as const satisfies readonly OrderItemStatusValue[];

export type BoardColumn = (typeof BOARD_COLUMNS)[number];

export const COLUMN_LABELS: Record<BoardColumn, string> = {
  PENDING: "Not started",
  DRAFT_CREATION: "Drafting",
  CUSTOMER_REVIEW: "With customer",
  REVISION: "Revising",
  APPROVED: "Approved",
  IN_PRODUCTION: "In production",
  QUALITY_CHECK: "Quality check",
  READY_FOR_RELEASE: "Ready",
};

interface Sortable {
  id: string;
  status: OrderItemStatusValue;
  priority: PriorityValue;
  dueDate: Date | null;
}

/** Urgent first, then the nearest deadline, then undated work. */
export function sortForBoard<T extends Sortable>(items: readonly T[]): T[] {
  return [...items].sort((a, b) => {
    const byPriority = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (byPriority !== 0) return byPriority;

    // A deadline outranks no deadline; two undated items keep their order.
    if (a.dueDate && b.dueDate) return a.dueDate.getTime() - b.dueDate.getTime();
    if (a.dueDate) return -1;
    if (b.dueDate) return 1;
    return 0;
  });
}

export function groupIntoColumns<T extends Sortable>(
  items: readonly T[],
): Record<BoardColumn, T[]> {
  const grouped = Object.fromEntries(
    BOARD_COLUMNS.map((column) => [column, [] as T[]]),
  ) as Record<BoardColumn, T[]>;

  for (const item of items) {
    const column = grouped[item.status as BoardColumn];
    // An item whose status is not a column (completed, cancelled) is simply not
    // board work. Dropping it beats crashing the board over one row.
    if (column) column.push(item);
  }

  for (const column of BOARD_COLUMNS) {
    grouped[column] = sortForBoard(grouped[column]);
  }

  return grouped;
}
```

- [ ] **Step 4: Run it and confirm it passes**

```bash
npx vitest run features/production/board.test.ts
```

Expected: PASS — 9 tests.

- [ ] **Step 5: Commit**

```bash
pnpm typecheck
```

Expected: exits 0.

```bash
git add features/production/board.ts features/production/board.test.ts
git commit -m "feat(production): group and order items into board columns

Completed and cancelled work is absent by design: the board is a queue of
work to do, and keeping finished items would grow a column nobody clears.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 8: `features/production/actions.ts`

**Files:** Create `features/production/actions.ts`

**Interfaces:**
- Consumes: `requireStaff` (Task 5), `moveItem`, `assignItem`, `addNote`,
  `moveOrder` (Task 6), `routes` (`@/lib/config`).
- Produces: `ProductionActionState`, `initialProductionState`, `moveItemAction`,
  `assignItemAction`, `addNoteAction` — consumed by Tasks 9, 10.

- [ ] **Step 1: Write `actions.ts`**

```typescript
"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth/require-staff";
import { routes } from "@/lib/config";
import {
  moveItem,
  assignItem,
  addNote,
  type OrderItemStatusValue,
} from "@/services/orders";

/**
 * Production Server Actions — Ph7.md §4, §7, §8.
 *
 * requireStaff() is called in every one of these, not only on the page that
 * renders the controls. A Server Action is reachable by POST regardless of what
 * was rendered, so a check that lives only in the page is decoration.
 */

export interface ProductionActionState {
  status: "idle" | "success" | "error";
  message: string | null;
}

export const initialProductionState: ProductionActionState = {
  status: "idle",
  message: null,
};

const VALID_STATUSES: readonly OrderItemStatusValue[] = [
  "PENDING",
  "DRAFT_CREATION",
  "CUSTOMER_REVIEW",
  "REVISION",
  "APPROVED",
  "IN_PRODUCTION",
  "QUALITY_CHECK",
  "READY_FOR_RELEASE",
  "COMPLETED",
  "CANCELLED",
];

function fail(message: string): ProductionActionState {
  return { status: "error", message };
}

export async function moveItemAction(
  _previous: ProductionActionState,
  formData: FormData,
): Promise<ProductionActionState> {
  const profile = await requireStaff();

  const itemId = String(formData.get("itemId") ?? "");
  const to = String(formData.get("to") ?? "");

  if (!itemId) return fail("Missing item.");
  if (!(VALID_STATUSES as readonly string[]).includes(to)) {
    return fail("That is not a valid status.");
  }

  const result = await moveItem(
    itemId,
    to as OrderItemStatusValue,
    profile.id,
  );
  if (!result.ok) return fail(result.message);

  revalidatePath(routes.admin.production);
  return { status: "success", message: null };
}

export async function assignItemAction(
  _previous: ProductionActionState,
  formData: FormData,
): Promise<ProductionActionState> {
  const profile = await requireStaff();

  const itemId = String(formData.get("itemId") ?? "");
  const raw = String(formData.get("assigneeId") ?? "");
  if (!itemId) return fail("Missing item.");

  // An empty value means "unassign", which is a legitimate thing to do.
  const result = await assignItem(itemId, raw || null, profile.id);
  if (!result.ok) return fail(result.message);

  revalidatePath(routes.admin.production);
  return { status: "success", message: null };
}

export async function addNoteAction(
  _previous: ProductionActionState,
  formData: FormData,
): Promise<ProductionActionState> {
  const profile = await requireStaff();

  const orderId = String(formData.get("orderId") ?? "");
  const body = String(formData.get("body") ?? "").trim();

  if (!orderId) return fail("Missing order.");
  if (!body) return fail("Write something first.");
  if (body.length > 2000) return fail("That note is too long.");

  const result = await addNote(orderId, profile.id, body);
  if (!result.ok) return fail(result.message);

  revalidatePath(routes.admin.bookings);
  return { status: "success", message: "Note saved." };
}
```

- [ ] **Step 2: Verify and commit**

```bash
pnpm typecheck
```

Expected: exits 0.

```bash
git add features/production/actions.ts
git commit -m "feat(production): add staff actions for moving, assigning and noting

requireStaff() is called in every action, not only on the page that
renders the controls -- an action is reachable by POST regardless of what
was rendered, so a page-only check is decoration.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 9: Board components

**Files:**
- Create: `features/production/components/item-card.tsx`
- Create: `features/production/components/board-column.tsx`
- Create: `features/production/components/production-board.tsx`

**Interfaces:**
- Consumes: `BOARD_COLUMNS`, `COLUMN_LABELS`, `groupIntoColumns` (Task 7),
  `moveItemAction`, `initialProductionState` (Task 8), `BoardItem` (Task 6).
- Produces: `ProductionBoard` — consumed by Task 10.

Movement uses a `<select>` and a form, not drag-and-drop. Ph7.md §UI asks for
"minimal clicks", and a select is one click that works on a phone, keyboard and
screen reader; drag-and-drop is none of those and is a much larger build.

- [ ] **Step 1: Write `item-card.tsx`**

```tsx
import type { BoardItem } from "@/services/orders";
import { MoveControl } from "./board-column";

const KIND_LABELS: Record<string, string> = {
  INVITATION_PRINT: "Invitation print",
  WEBSITE: "Website",
  REPRINT: "Reprint",
  OTHER: "Other",
};

const PRIORITY_STYLES: Record<string, string> = {
  URGENT: "bg-destructive/10 text-destructive",
  HIGH: "bg-amber-100 text-amber-900",
  NORMAL: "bg-muted text-muted-foreground",
  LOW: "bg-muted text-muted-foreground",
};

export function ItemCard({ item }: { item: BoardItem }) {
  const customer =
    item.order.profile.displayName ?? item.order.profile.email;

  return (
    <article className="space-y-2 rounded-md border bg-background p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium">{KIND_LABELS[item.kind] ?? item.kind}</span>
        <span
          className={`rounded px-1.5 py-0.5 text-xs ${PRIORITY_STYLES[item.priority] ?? ""}`}
        >
          {item.priority.toLowerCase()}
        </span>
      </div>

      <p className="text-muted-foreground">
        {item.order.reference} · {customer}
      </p>

      {item.order.invitation ? (
        <p className="text-muted-foreground truncate">
          {item.order.invitation.title}
        </p>
      ) : null}

      <p className="text-muted-foreground text-xs">
        {item.quantity > 1 ? `×${item.quantity} · ` : ""}
        {item.dueDate
          ? `due ${item.dueDate.toLocaleDateString()}`
          : "no due date"}
        {item.assignedTo
          ? ` · ${item.assignedTo.displayName ?? item.assignedTo.email}`
          : " · unassigned"}
      </p>

      {item.notes ? <p className="text-muted-foreground">{item.notes}</p> : null}

      <MoveControl itemId={item.id} current={item.status} />
    </article>
  );
}
```

- [ ] **Step 2: Write `board-column.tsx`**

```tsx
"use client";

import { useFormState } from "react-dom";
import {
  moveItemAction,
  initialProductionState,
} from "../actions";
import {
  ITEM_TRANSITIONS,
  type OrderItemStatusValue,
} from "@/services/orders";
import { COLUMN_LABELS, type BoardColumn } from "../board";

const ALL_LABELS: Record<string, string> = {
  ...COLUMN_LABELS,
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

/**
 * Only the moves the transition table permits are offered. Rendering every
 * status and rejecting most of them on submit would teach staff to expect
 * failure; the table is the same one the server enforces, so the menu cannot
 * drift from the rules.
 */
export function MoveControl({
  itemId,
  current,
}: {
  itemId: string;
  current: OrderItemStatusValue;
}) {
  const [state, formAction] = useFormState(
    moveItemAction,
    initialProductionState,
  );
  const allowed = ITEM_TRANSITIONS[current];

  if (allowed.length === 0) return null;

  return (
    <form action={formAction} className="space-y-1">
      <input type="hidden" name="itemId" value={itemId} />
      <label className="sr-only" htmlFor={`move-${itemId}`}>
        Move this item
      </label>
      <select
        id={`move-${itemId}`}
        name="to"
        defaultValue=""
        onChange={(event) => event.currentTarget.form?.requestSubmit()}
        className="h-8 w-full rounded border border-input bg-background px-2 text-xs"
      >
        <option value="" disabled>
          Move to…
        </option>
        {allowed.map((status) => (
          <option key={status} value={status}>
            {ALL_LABELS[status] ?? status}
          </option>
        ))}
      </select>
      {state.status === "error" && state.message ? (
        <p className="text-destructive text-xs">{state.message}</p>
      ) : null}
    </form>
  );
}

export function BoardColumnView({
  column,
  count,
  children,
}: {
  column: BoardColumn;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-muted/40 flex w-72 shrink-0 flex-col rounded-lg p-3">
      <header className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-medium">{COLUMN_LABELS[column]}</h2>
        <span className="text-muted-foreground text-xs">{count}</span>
      </header>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
```

- [ ] **Step 3: Write `production-board.tsx`**

```tsx
import type { BoardItem } from "@/services/orders";
import { BOARD_COLUMNS, groupIntoColumns } from "../board";
import { BoardColumnView } from "./board-column";
import { ItemCard } from "./item-card";

export function ProductionBoard({ items }: { items: BoardItem[] }) {
  const grouped = groupIntoColumns(items);

  return (
    // The board scrolls horizontally inside its own container so the page body
    // never does — eight columns will not fit a laptop, let alone a phone.
    <div className="-mx-6 overflow-x-auto px-6 pb-4">
      <div className="flex gap-3">
        {BOARD_COLUMNS.map((column) => (
          <BoardColumnView
            key={column}
            column={column}
            count={grouped[column].length}
          >
            {grouped[column].map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </BoardColumnView>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Verify and commit**

```bash
pnpm typecheck
```

Expected: exits 0.

```bash
pnpm lint
```

Expected: exits 0.

```bash
git add features/production/components
git commit -m "feat(production): add the kanban board components

Movement is a select, not drag-and-drop: one click that works on a phone,
keyboard and screen reader. The menu offers only the moves the transition
table permits, so it cannot drift from what the server enforces.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 10: Production and bookings pages

**Files:**
- Modify: `app/(dashboard)/admin/production/page.tsx` (replace the placeholder)
- Modify: `app/(dashboard)/admin/bookings/page.tsx` (replace the placeholder)

**Interfaces:**
- Consumes: `requireStaff` (Task 5), `listBoardItems`, `listOrders` (Task 6),
  `ProductionBoard` (Task 9).
- Produces: the customer-facing surface. Nothing imports from these.

- [ ] **Step 1: Replace the production page**

```tsx
import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/require-staff";
import { listBoardItems } from "@/services/orders";
import { ProductionBoard } from "@/features/production/components/production-board";
import { EmptyState } from "@/components/ui/empty-state";
import { Factory } from "lucide-react";

export const metadata: Metadata = { title: "Production — ML-DEP" };

export default async function AdminProductionPage() {
  await requireStaff();

  const items = await listBoardItems();

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Production</h1>
        <p className="text-muted-foreground text-sm">
          Every deliverable currently in flight. {items.length} item
          {items.length === 1 ? "" : "s"}.
        </p>
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon={Factory}
          title="Nothing in production"
          description="Deliverables appear here as soon as an order has work on it."
        />
      ) : (
        <ProductionBoard items={items} />
      )}
    </div>
  );
}
```

If `EmptyState`'s props differ from `icon` / `title` / `description`, match the
signature in `components/ui/empty-state.tsx` rather than changing that component.

- [ ] **Step 2: Replace the bookings page**

```tsx
import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth/require-staff";
import { listOrders } from "@/services/orders";
import { EmptyState } from "@/components/ui/empty-state";
import { ClipboardList } from "lucide-react";

export const metadata: Metadata = { title: "Bookings — ML-DEP" };

const STATUS_LABELS: Record<string, string> = {
  INQUIRY: "Inquiry",
  QUOTATION: "Quotation",
  CONFIRMED: "Confirmed",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  ARCHIVED: "Archived",
  CANCELLED: "Cancelled",
};

export default async function AdminBookingsPage() {
  await requireStaff();

  const orders = await listOrders();

  return (
    <div className="space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">Bookings</h1>
        <p className="text-muted-foreground text-sm">
          Every order, newest first.
        </p>
      </header>

      {orders.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No bookings yet"
          description="Orders appear here once they are created."
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] text-sm">
            <thead className="text-muted-foreground text-left">
              <tr className="border-b">
                <th className="py-2 pr-4 font-medium">Reference</th>
                <th className="py-2 pr-4 font-medium">Customer</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Items</th>
                <th className="py-2 font-medium">Created</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-b last:border-0">
                  <td className="py-2 pr-4 font-medium">{order.reference}</td>
                  <td className="py-2 pr-4">
                    {order.profile.displayName ?? order.profile.email}
                  </td>
                  <td className="py-2 pr-4">
                    {STATUS_LABELS[order.status] ?? order.status}
                  </td>
                  <td className="py-2 pr-4">{order.items.length}</td>
                  <td className="py-2">
                    {order.createdAt.toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Verify and commit**

```bash
pnpm typecheck
```

Expected: exits 0.

```bash
pnpm lint
```

Expected: exits 0.

```bash
git add "app/(dashboard)/admin/production/page.tsx" "app/(dashboard)/admin/bookings/page.tsx"
git commit -m "feat(production): replace the admin placeholders with real pages

Both call requireStaff() before reading anything, so a customer who
guesses the URL gets the same 404 as a stranger.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

### Task 11: Verification, docs, CHANGELOG

**Files:**
- Create: `docs/order-workflow.md`
- Modify: `docs/architecture.md`, `CHANGELOG.md`

- [ ] **Step 1: Full automated verification**

```bash
pnpm lint
```

```bash
pnpm typecheck
```

```bash
pnpm test
```

```bash
NODE_OPTIONS="--max-old-space-size=1536" pnpm build
```

Expected: all four exit 0, and the test count is **513** — the 468 baseline plus
14 (Task 2) + 10 (Task 3) + 9 (Task 4) + 3 (Task 5) + 9 (Task 7). If it is lower,
a test file is not being collected; find out which before continuing. Run
`pnpm typecheck` on its own line — piping it into `tail` masks the exit code.

- [ ] **Step 2: Manual verification**

Point `DATABASE_URL` at the local PGlite database first (`pnpm db:local`) — do
**not** click through against production, which `.env.local` points at by
default.

With a staff profile:

1. `/admin/production` renders the board with eight columns and no horizontal
   scrollbar on the page body.
2. `/admin/bookings` lists orders.
3. Moving an item through the select advances it, and the card reappears in the
   new column.
4. The move menu never offers a status the transition table forbids — e.g. an
   item in `IN_PRODUCTION` offers Quality check and Cancelled, never Completed.

With a `CUSTOMER` profile:

5. `/admin/production` and `/admin/bookings` both return **404**, not a redirect.
6. POSTing `moveItemAction` directly still fails — the action calls
   `requireStaff()` itself.

Then confirm the audit trail in the database:

```bash
npx prisma studio
```

Every status change from step 3 has a matching `order_events` row with
`fromStatus`, `toStatus` and `actorId`. An order that advanced because its items
did has a second row with a null `actorId`.

- [ ] **Step 3: Write `docs/order-workflow.md`**

```markdown
# Order workflow

Phase 7c. The internal production half of Phase 7. Spec:
`docs/superpowers/specs/2026-07-21-phase7c-production-workflow-design.md`.

## Shape

```
services/orders/          engine — pure rules plus persistence
  status.ts               transition tables for both enums
  derive.ts               order status follows its items
  reference.ts            ML-YYYY-NNNN numbering
  repository.ts           Prisma; transitions are transactional
features/production/       internal workflow feature
  board.ts                column membership and ordering
  actions.ts              staff Server Actions
lib/auth/require-staff.ts  the role gate
```

## Two status enums, not one

Ph7.md §2 lists 13 states in one chain, but *Quotation* is commercial and
*Quality Check* applies to one physical item. One enum would leave an order
sitting in "Print Production" while its website half was untouched. So
`OrderStatus` tracks the engagement and `OrderItemStatus` tracks each
deliverable. The spec carries a mapping table back to Ph7.md's list.

## Rules worth keeping

- **Transitions live in a table**, not in conditionals across actions. Adding a
  state cannot silently leave a hole somewhere else.
- **A status change and its audit row are written in one transaction.** A status
  that moved without leaving a trace is the failure this phase exists to
  prevent, so it is unreachable rather than merely discouraged.
- **Order status is derived on write**, and the derived move is checked against
  the same table a human move goes through. A derivation that bypassed the rules
  would be a second, quieter way into an illegal state.
- **References come from the highest existing reference**, never a row count. A
  count hands the same booking ID out twice the first time an order is deleted.
- **Staff surfaces 404 rather than redirect**, and the check lives in the Server
  Actions as well as the pages.
- **The board omits completed and cancelled work.** It is a queue of what to do,
  not a history.

## Where truth lives

Ph7.md §11 says this module tracks status only, so where the fact already exists
elsewhere it is read, not copied: website deployment from `Invitation.isPublished`,
print files from `PdfGeneration.status` via `OrderItem.pdfGenerationId`.

`OrderItemStatus` is the one unavoidable duplication. A print item can sit in
`QUALITY_CHECK` while its `PdfGeneration` has been `READY` for days — the file
existing is not the job being done. The item's status is authoritative for
workflow; the linked records are authoritative for artefacts. The UI shows both
and never silently reconciles them.

## Not here

Customer-facing order views, proof review and approval screens are **7b**.
Notifications, search and reporting are **7d**. Payment and deployment
automation are later phases.
```

- [ ] **Step 4: Update `docs/architecture.md`**

In the frameworks table, after the `Print engine (Ph6)` row, add:

```markdown
| Order engine (Ph7c) | `services/orders/` | `features/production/` alone — see [order-workflow.md](order-workflow.md) |
```

- [ ] **Step 5: Update `CHANGELOG.md`**

Under `## [Unreleased]` → `### Added`, above the Phase 6 entry:

```markdown
- Phase 7c — Internal Production Workflow.
  - `Order` and `OrderItem`: one commercial engagement with any number of
    deliverables, so a reprint or a later website is not a duplicated order.
  - A kanban board at `/admin/production` covering every in-flight deliverable,
    with assignment, priority and due dates; `/admin/bookings` lists orders.
  - Status transitions are enforced from a table and audited: every change
    writes an `OrderEvent` in the same transaction, and an order's status
    follows its items without anyone maintaining it by hand.
  - Human-facing booking references, `ML-2026-0042`, sequenced per year.
  - All internal surfaces are staff-only and return 404 rather than redirect,
    enforced in Server Actions as well as page loads.
```

- [ ] **Step 6: Final verification and commit**

```bash
pnpm lint
```

```bash
pnpm typecheck
```

```bash
pnpm test
```

```bash
NODE_OPTIONS="--max-old-space-size=1536" pnpm build
```

Expected: all four exit 0.

```bash
git add -A
git commit -m "docs(orders): document the order workflow and close out Phase 7c

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Self-Review

**Spec coverage.** Every section of
`docs/superpowers/specs/2026-07-21-phase7c-production-workflow-design.md` maps to
a task:

| Spec section | Task |
|---|---|
| Order core (`Order`, `OrderItem`, `OrderEvent`, `OrderNote`) | 1 |
| Status enums and the Ph7.md mapping | 1, 2 |
| Transitions — controlled | 2 |
| Transitions — audited, transactional | 6 |
| Order status derived from items | 3 |
| Reference numbering | 4 |
| Access control | 5, 8, 10 |
| Production dashboard / kanban (§4, §10) | 7, 9, 10 |
| Task assignment (§7) | 1, 6, 8 |
| Internal notes (§8) | 1, 6, 8 |
| Website/print status tracking (§11) | 1 (`pdfGenerationId`), 11 (documented) |
| Module structure | 6 (barrel), 7 |
| Testing | 2, 3, 4, 5, 7 |
| Migration | 1 |

**Placeholder scan.** No "TBD", no "add validation", no "similar to Task N".
Every code step carries complete code. The one conditional instruction — matching
`EmptyState`'s actual prop names in Task 10 — names the file to check rather than
leaving it open.

**Type consistency.** Names are used identically throughout: `OrderStatusValue`,
`OrderItemStatusValue`, `PriorityValue`, `PRIORITY_ORDER`, `canTransitionOrder`,
`canTransitionItem`, `ITEM_TRANSITIONS`, `deriveOrderStatus`, `nextReference`,
`isStaff`, `requireStaff`, `listBoardItems`, `moveItem`, `MoveResult`,
`BOARD_COLUMNS`, `COLUMN_LABELS`, `groupIntoColumns`, `sortForBoard`,
`moveItemAction`, `initialProductionState`, `ProductionBoard`, `BoardItem`.

Three things fixed during this review:

1. `board.ts` originally took `BoardItem` directly, which would have dragged a
   Prisma type into a pure module. It now takes a structural `Sortable`, so the
   tests need no Prisma.
2. `MoveControl` lives in `board-column.tsx` but is used by `item-card.tsx`; the
   import is stated explicitly in Task 9 Step 1 so the two files are not written
   in the wrong order.
3. The Task 11 expected test count is stated exactly — 468 + 14 + 10 + 9 + 3 + 9
   = **513** — rather than left vague, so a silently uncollected test file is
   visible rather than absorbed. (This review first wrote 503 and 513 in two
   places; the arithmetic is 513.)
