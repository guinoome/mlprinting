# e2e/

Playwright end-to-end tests. Config: `playwright.config.ts`.

Empty in Phase 0 — there are no user flows to drive yet. Specs arrive with the
features they cover.

The journey Ph10.md §2 requires end-to-end coverage of, once it exists:
registration → login → template selection → builder → media upload → preview →
approval → payment → website generation → PDF generation → deployment →
delivery.

```bash
pnpm test:e2e
```
