# Current ML-DEP handover

Resume from [`docs/handovers/2026-09-10-mobile-marketplace-overhaul.md`](docs/handovers/2026-09-10-mobile-marketplace-overhaul.md).

PR #9 and production main `5cdb24d43a741e866af914789b54ec04a5c4fc9e` already contain the seven released invitation experiences, the mobile `Find your experience` rail, and the earlier receipt-verification release. Do not rebuild or redeploy those milestones.

PR #10 merged the shared mobile-first marketplace overhaul and three opening-layer fixes as `a8bf686fb5b5da576eddda45a125c511ebb80765`. Production structure and phone interactions are verified. A production visual review then found one contrast defect caused by non-emitted Tailwind opacity utilities; the explicit-opacity correction is implemented and fully revalidated locally. Continue only with its exact follow-up release action in the linked handover. Automatic PayMongo GCash, Maya, and QRPh remain credential-gated.
