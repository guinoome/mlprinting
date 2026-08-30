# ML-DEP Local / GitHub Precheck

Date: 2026-08-29
Remote: `https://github.com/guinoome/mlprinting`
Remote baseline: `107561cda6f52ca0175a85f01fd4a62bb19839c4`

## Reconciliation

The transferred ML-DEP folder originally contained 66 files from an older scaffold. `mlprinting/main` contained 465 tracked files. With owner approval, the remote text/source baseline was synchronized into this folder through the managed patch service.

Classification:

- **SAFE REMOTE WORK:** tracked application, feature, service, library, Prisma, build and CI files from `mlprinting/main`.
- **MUST PRESERVE:** 13 local-only planning/history files under `ML Digital Event Platform (ML-DEP)-revise plan/`, `.claude/settings.local.json`, and `raw/` continuation/context documents.
- **SAFE LOCAL WORK:** WP-01 experience-engine files and the feature-flag integration added after synchronization.
- **RECORDED LIMITATION:** this directory remains physically nested inside the FDG Knowledge Repository because the managed workspace does not permit creating a nested `.git` directory. Git validation uses a clean audit checkout of `mlprinting/main` with the identical WP-01 patch.

No local-only planning/history file was deleted or replaced.
