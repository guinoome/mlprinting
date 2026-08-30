# Lifecycle notifications

ML-DEP plans durable event-lifecycle notifications when an invitation is published and whenever its memory-sharing settings change.

## Planned notifications

- **Memory prompt** — scheduled when memory sharing opens.
- **Archive ready** — scheduled one day after the memory window closes.
- **Thank-you** — scheduled one day after the event when transactional email notifications are enabled.
- **Review request** — scheduled three days after the event only when marketing follow-up is enabled.

Each row records its notification kind, schedule, delivery status, payload, consent basis, attempt count, and delivery error. The invitation and profile own the row; removing either cascades the notification.

## Provider boundary

`NotificationProvider` is the delivery contract. The initial `in-app` adapter marks the durable dashboard notification as delivered without introducing an email or SMS vendor. A future adapter can dispatch email or SMS through `dispatchDueNotifications` without changing planning rules.

Workers claim due rows before delivery. A processing claim becomes eligible again after 15 minutes so an interrupted worker cannot strand a notification permanently. Provider failures are recorded as `FAILED`; rescheduling the invitation resets applicable rows to `PENDING`.

There is deliberately no unauthenticated dispatch endpoint. Production scheduling must call the dispatcher from an authenticated job runner or deployment platform and supply the chosen provider adapter.

## Privacy and operational rules

- Every planned follow-up records its consent basis.
- Turning off a preference or memory sharing cancels unsent notifications that are no longer applicable.
- The customer dashboard only reads notifications owned by the signed-in profile.
- Payloads are validated before rendering as links or copy.
- Event dates are required; the planner does not invent a schedule for incomplete invitations.
