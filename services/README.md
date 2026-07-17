# services/

Reusable service layer — shared logic consumed by multiple features.

Current occupants:

- **`upload/`** — the file upload framework (Ph1 §8). Validation and constraints
  are pure and run on both sides; `storage.ts` is `server-only` and wraps
  Supabase Storage. Ph4's Media Library is its intended second consumer.

Arriving later: PDF generation (Ph6), deployment (Ph8).

Rule (from Ph4.md §15): services expose interfaces that features depend on;
services never depend on features. Keep coupling loose.

A service owns a *capability*, not a *record*. `upload/` moves bytes and returns
a path — it has no concept of an "asset", because Ph4 makes the Media Library
the sole owner of those. A service that invents its own record puts a second
owner in the system, and then two places disagree about what exists.
