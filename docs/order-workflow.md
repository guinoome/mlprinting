# Order workflow

Phase 7c — the internal production half of Phase 7. Spec:
`docs/superpowers/specs/2026-07-21-phase7c-production-workflow-design.md`.

## Shape

```
services/orders/          engine — pure rules plus persistence
  types.ts                shared vocabulary; no Prisma import
  status.ts               transition tables for both enums
  derive.ts               order status follows its items
  reference.ts            ML-YYYY-NNNN numbering
  repository.ts           Prisma; transitions are transactional
  index.ts                barrel
features/production/      internal workflow feature
  board.ts                column membership and ordering
  actions.ts              staff Server Actions
  components/             kanban board, column, item card
lib/auth/is-staff.ts      the pure role predicate
lib/auth/require-staff.ts the server guard
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
  Actions as well as the pages — an action is reachable by POST regardless of
  what rendered.
- **The board omits completed and cancelled work.** It is a queue of what to do,
  not a history.

## Two import boundaries worth explaining

`lib/auth/is-staff.ts` is separate from `require-staff.ts` because the latter
reaches for the session, which pulls in React's `cache()` and a Supabase client.
Neither exists outside a server request, so keeping them in one file made the
role rule untestable.

`features/production/board.ts` imports `services/orders/types` directly rather
than the barrel. The barrel re-exports the repository, so reaching it would pull
Prisma into a module whose whole job is arranging plain objects. `types.ts` is
shared vocabulary, not an internal, so the boundary the barrel protects is not
the one being crossed.

## Where truth lives

Ph7.md §11 says this module tracks status only, so where a fact already exists
elsewhere it is read, not copied: website deployment from
`Invitation.isPublished`, print files from `PdfGeneration.status` via
`OrderItem.pdfGenerationId`.

`OrderItemStatus` is the one unavoidable duplication. A print item can sit in
`QUALITY_CHECK` while its `PdfGeneration` has been `READY` for days — the file
existing is not the job being done. The item's status is authoritative for
workflow; the linked records are authoritative for artefacts. The UI shows both
and never silently reconciles them.

## Migrations

The Phase 7c migration was generated with `--from-migrations` against a shadow
database, not `--from-schema-datasource`. The local PGlite database was two
phases behind, so diffing against it swept Phase 5 and Phase 6 objects into the
delta — which would have failed on production, where they already exist. Prefer
`--from-migrations` whenever the local database's history is uncertain:

```bash
npx prisma migrate diff --from-migrations ./prisma/migrations \
  --to-schema-datamodel prisma/schema.prisma \
  --shadow-database-url "<local url>" --script
```

**Never `prisma migrate dev`** — it is broken against this project's local
database.

## Not here

Customer-facing order views, proof review and approval screens are **7b**.
Notifications, search and reporting are **7d**. Payment and deployment
automation are later phases.
