# Deployment workflow

**Scope:** platform deployment — shipping ML-DEP itself.

Not to be confused with the **per-order website deployment** in Ph8.md, where an
approved customer order triggers generation and deployment of *that customer's*
event site. That is a product feature and depends on Phases 5–8. This document
covers only the pipeline that deploys this repository.

---

## Pipeline

```
Local development
        │
        ▼
   Git commit
        │
        ▼
GitHub (guinoome/mlprinting)
        │
        ▼
 Vercel builds automatically
        │
        ├── main branch      → Production
        └── other branches   → Preview deployment
```

Once configured, no manual deployment step exists (PROJECT_CHARTER.md).

**Phase 0 status:** the pipeline is *prepared, not live* (ML-DES.md §5). Wiring
is verified by a successful build; the site is not made public.

---

## First-time setup

Steps 1–3 require account credentials and must be done by the repository owner.

### 1. Push to GitHub

The remote already exists — reuse it, do not create a new one
(Phase0-TechStack-Spec.md §2):

```bash
git remote add origin https://github.com/guinoome/mlprinting.git
git push -u origin main
```

### 2. Create the Supabase project

At <https://supabase.com> (free tier). Collect the four values listed in
[development-workflow.md](development-workflow.md#filling-in-envlocal).

### 3. Link Vercel

At <https://vercel.com> → New Project → import `guinoome/mlprinting`.

Framework preset: **Next.js** (auto-detected). Build command, output directory,
and install command all use the defaults.

### 4. Configure environment variables

In Vercel → Project → Settings → Environment Variables, add every variable from
`.env.example`, for Production **and** Preview:

| Variable | Exposure |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret — server only** |
| `DATABASE_URL` | **Secret — server only** |
| `NEXT_PUBLIC_APP_URL` | Public — the deployment URL |

Secrets are never committed. `.env.local` is gitignored, and Vercel is the only
place production values live.

### 5. Verify

Push a commit and confirm the Vercel build succeeds. That is the Phase 0
deliverable — a green build, not a public site.

---

## Routine deploys

```bash
git push origin feat/some-change   # → Preview deployment, unique URL
```

Merge to `main` → Production deploy. `main` must always be deployable
(V1 doc §9), which is what CI on every pull request protects.

## CI

`.github/workflows/ci.yml` runs on every push and pull request: lint, typecheck,
unit tests, build. It builds without secrets — code must tolerate absent env
vars at build time (see `lib/env.ts`, which reads lazily for exactly this
reason).

CI failing means `main` would not be deployable. Fix forward or revert.

## Rollback

Vercel keeps every prior deployment. To roll back: Vercel → Deployments → select
the last known-good → **Promote to Production**. This is instant and needs no
rebuild.

Then fix the underlying problem in git — a promoted rollback changes what is
served, not what is on `main`, and the next merge to `main` will redeploy the
broken code if it is still there.

## Domains

Phase 0: the default `*.vercel.app` URL.

Ph8.md §7 scopes MVP to an ML Printing subdomain, with custom domains, domain
mapping, and SSL management listed future-ready.
