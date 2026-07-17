# features/

Domain modules — feature-based organization. Each feature gets its own
self-contained folder with its own components, schema, and actions.

Current occupants:

- **`auth/`** — login, registration, logout, password change (Ph1 §4).
- **`account/`** — profile, profile picture, preferences (Ph1 §5).
- **`template-marketplace/`** — catalog, search, filters, preview (Ph2).
- **`invitation-builder/`** — the guided workflow and the invitation dataset (Ph3).

Arriving later: `media-library` (Ph4), `booking` (Ph7), `payment` (Ph8).

Rule: a feature may depend on `components/`, `services/`, and `lib/`, but
features should not depend on each other directly. Cross-feature communication
goes through `services/`.

**The rule holds with no exceptions.** Phase 1 bent it once — `account/` imported
form primitives from `auth/` — and wrote down the trigger: when a third feature
needs them, move them. Phase 3 was the third, and they moved to
`components/form/` and `lib/forms/`.

Keep it that way. If you find yourself importing another feature, one of these
is the answer:

- The thing is shared UI → `components/`.
- The thing is a shared capability → `services/`.
- The thing is a shared type or pure helper → `lib/`.
- Two features genuinely need to meet → compose them in a page under `app/`, or
  hand off through a route in `lib/config` (Ph2 → Ph3 does exactly this).
