# features/

Domain modules — feature-based organization. Each feature gets its own
self-contained folder with its own components, schema, and actions.

Current occupants:

- **`auth/`** — login, registration, logout, password change (Ph1 §4).
- **`account/`** — profile, profile picture, preferences (Ph1 §5).

Arriving later: `template-marketplace` (Ph2), `invitation-builder` (Ph3),
`media-library` (Ph4), `booking` (Ph7), `payment` (Ph8).

Rule: a feature may depend on `components/`, `services/`, and `lib/`, but
features should not depend on each other directly. Cross-feature communication
goes through `services/`.

**The rule is bent once, deliberately.** `account/` imports `FormField`,
`SubmitButton`, `FormStatus`, and the `ActionState` type from `auth/`. They were
written for the auth forms and the account forms are their second user — moving
them out on the strength of two callers would be guessing at the shape a third
needs. When that third caller appears, the primitives move to `components/` and
the type to `lib/`, rather than a second feature reaching across.

If you are about to add a third such import: that is the signal. Move them.
