# services/

Reusable service layer — shared logic consumed by multiple features.

Examples that will live here in later phases: media storage service (Phase 4),
PDF generation service (Phase 6), deployment service (Phase 8).

Rule (from Phase 4 spec): services expose interfaces that features depend on;
services never depend on features. Keep coupling loose.

Empty in Phase 0 except the Supabase auth clients in `lib/supabase/`.
