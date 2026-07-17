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

**Status:** the pipeline is *prepared, not live* (ML-DES.md §5). Wiring is
verified by a successful build; the site is not made public.

---

## First-time setup

Steps 1–4 require account credentials and must be done by the repository owner.

The application builds and runs with none of this configured — that is
deliberate, and it is what lets CI verify the code without secrets. The cost is
that a green build proves nothing about these steps. Until they are done, the
dashboard renders an honest "Setup incomplete" page rather than pretending.

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

### 3. Create the storage buckets

Phase 1's upload framework (`services/upload`) writes to two buckets. Create both
in Supabase → Storage:

| Bucket | Access | Holds |
|---|---|---|
| `avatars` | Public | Profile pictures |
| `media` | **Private** | Customer media (Ph4), served via signed URLs |

Then add a row-level security policy on each restricting writes to the caller's
own folder — objects are stored at `<userId>/…`, and that prefix is what the
policy matches on:

```sql
-- Per bucket. Repeat with bucket_id = 'media'.
create policy "own folder write" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
```

**This step is not optional.** The application derives every upload path from the
session, so it cannot write outside a user's own prefix — but that is application
code, and application code is not an access policy. Without RLS, anyone holding
the anon key can write anywhere in the bucket, and the anon key is public by
design. The code convention and the policy have to agree; only the policy is
enforced.

### 4. Link Vercel

At <https://vercel.com> → New Project → import `guinoome/mlprinting`.

Framework preset: **Next.js** (auto-detected). Build command, output directory,
and install command all use the defaults.

### 5. Configure environment variables

In Vercel → Project → Settings → Environment Variables, add every variable from
`.env.example`, for Production **and** Preview:

| Variable | Exposure |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public |
| `SUPABASE_SERVICE_ROLE_KEY` | **Secret — server only** |
| `DATABASE_URL` | **Secret — server only** |
| `NEXT_PUBLIC_APP_URL` | Public — the deployment URL |
| `NEXT_PUBLIC_FEATURE_*` | Public — leave unset; each turns on with its phase |

Secrets are never committed. `.env.local` is gitignored, and Vercel is the only
place production values live.

Anything named `NEXT_PUBLIC_*` is compiled into the browser bundle and is
readable by anyone who loads the site. That is fine for the anon key, which is
designed for it, and fatal for the service-role key, which bypasses row-level
security entirely. Never rename a secret to carry that prefix to make an import
work.

### 6. Run the database migration

```bash
pnpm prisma:migrate   # tables
pnpm prisma:seed      # the template catalog
```

The migration creates the identity tables (`profiles`, `preferences`) and the
template catalog. Until it runs, sign-in succeeds and the dashboard then fails to
load a profile.

The seed populates the catalog. It is idempotent — every write upserts on a slug,
so running it twice changes nothing. Without it the marketplace renders an honest
"No templates published yet" rather than breaking.

To work on any of this without Supabase, run a local Postgres instead — no
install, no credentials:

```bash
pnpm db:local   # PGlite (Postgres compiled to WASM) on 127.0.0.1:55432
```

Then point the app at it in `.env.local`. The extra params are not optional —
PGlite serves one connection at a time, and Prisma will otherwise open a pool and
kill it:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:55432/postgres?pgbouncer=true&connection_limit=1"
```

This is for development and verification. It is not a substitute for testing
against the real Supabase database before a release.

### 7. Verify

Push a commit and confirm the Vercel build succeeds, then sign in and reach the
dashboard. A green build alone proves the pipeline; it does not prove the
Supabase and database gates above were completed, because the build deliberately
does not need them.

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
