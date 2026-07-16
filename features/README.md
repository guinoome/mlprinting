# features/

Domain modules — feature-based organization. Each future feature (invitation
builder, template marketplace, media library, booking, payment, etc.) gets its
own self-contained folder here with its own components, hooks, and logic.

Empty in Phase 0 by design — no business features yet.

Rule: a feature may depend on `components/`, `services/`, and `lib/`, but
features should not depend on each other directly. Cross-feature communication
goes through `services/`.
