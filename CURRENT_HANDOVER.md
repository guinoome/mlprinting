# Current ML-DEP handover

Resume from [`docs/handovers/2026-09-11-starlight-personalized-reveal.md`](docs/handovers/2026-09-11-starlight-personalized-reveal.md).

Production main contains the seven earlier invitation experiences, Starlight
Pony Dreamscape, the mobile marketplace overhaul, its contrast correction, and
private manual receipt verification. Do not rebuild or redeploy those
milestones.

The new Starlight two-state reveal is validated locally on branch
`codex/starlight-personalized-reveal`: illustrated entrance, realistic fictional
sample after opening, live `Mia`/age/countdown/RSVP, Birthday discovery portal,
and a dedicated `Choose a world, not a card` feature. Validated feature commit
`f8e72a520fb5e02f11bd01efc63d99f589122569` is pushed on
`codex/starlight-personalized-reveal`; a release PR is not yet created or
merged, the additive migration is not applied in Supabase, and production is
not yet verified. Continue from that release gate; do not redo its
implementation or local phone QA. Automatic PayMongo GCash, Maya, and QRPh
remain credential-gated.
