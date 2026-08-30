# Controlled commerce and publication

ML-DEP now enforces the handoff sequence `Preview → Approve → Order → Pay → Publish/Deliver` at the server boundary.

## Publication gate

Publishing is allowed only when all of these facts are true in the same database transaction:

1. the invitation builder status is `COMPLETED`;
2. a non-cancelled order is linked to the invitation;
3. the order contains a `WEBSITE` item;
4. every website item has reached `APPROVED` or a later production state; and
5. the order payment is `CAPTURED` or explicitly `WAIVED` by staff.

The customer UI explains the first unmet gate and disables publication, but the repository repeats every check. A direct Server Action POST therefore cannot bypass approval or payment. Publication and unpublication each append a `PUBLICATION` order event.

## Settlement model

Each order has at most one settlement row. It stores minor-unit amount, ISO-style currency code, provider, optional provider reference, verified timestamp, and state. Payment changes append `PAYMENT_STATUS` events to the existing order audit trail.

Staff may record an offline payment or a reasoned waiver from the protected bookings page. This supports cash/bank-transfer operations without pretending a browser redirect proved payment.

`PaymentProvider.verify()` is the replaceable boundary for an online provider. Only its server-verified event may be passed to `applyVerifiedPaymentEvent()`. That function rejects provider, reference, amount, currency, and state-transition mismatches and handles repeat events idempotently.

No public webhook is included until a provider and its signature scheme are selected. Adding one requires authenticating the raw request with that adapter before any database write.

## Rollback

Unpublishing remains reversible and keeps the slug. A payment can progress to refund but a refunded order no longer satisfies publication. The migration is additive; rolling application code back leaves the payment and audit history intact.
