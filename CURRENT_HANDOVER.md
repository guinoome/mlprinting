# Current ML-DEP handover

Resume from [`docs/handovers/2026-09-10-starlight-pony-dreamscape.md`](docs/handovers/2026-09-10-starlight-pony-dreamscape.md).

Production main contains the seven earlier invitation experiences, Starlight
Pony Dreamscape, the mobile marketplace overhaul, its contrast correction, and
private manual receipt verification. Do not rebuild or redeploy those
milestones.

Starlight is merged at `72c49854266922ba3e753f1c8f80a0fcaf827d1b`, its
additive Supabase migration is independently verified, and production phone
QA passed from 360 through 430 px without horizontal overflow. The only
Starlight follow-up is provider-backed child-and-pony personalization after
consented customer photos and provider credentials exist. Automatic PayMongo
GCash, Maya, and QRPh remain credential-gated.
