# Current ML-DEP handover

Resume from [`docs/handovers/2026-09-10-mobile-marketplace-overhaul.md`](docs/handovers/2026-09-10-mobile-marketplace-overhaul.md).

PR #9 and production main `5cdb24d43a741e866af914789b54ec04a5c4fc9e` already contain the seven released invitation experiences, the mobile `Find your experience` rail, and the earlier receipt-verification release. Do not rebuild or redeploy those milestones.

PR #10 merged the shared mobile-first marketplace overhaul and three opening-layer fixes as `a8bf686fb5b5da576eddda45a125c511ebb80765`. PR #12 merged the visual-review contrast correction as `fdcbc95955f91598cb55e665f431c5d7bf7cb783`. Both production deployments are verified, including the final computed colours and eight public 320/390 px interaction tests. Do not redeploy this milestone. Continue only with the PayMongo credential-and-signed-webhook gate recorded in the linked handover.
