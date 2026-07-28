-- Storage Row Level Security for ML-DEP.
--
-- Run once in Supabase → SQL Editor. Safe to re-run: every policy is dropped
-- before it is created.
--
-- WHY THESE EXACT RULES
--
-- Both layouts put the owner's id in the first path segment:
--   media    {profileId}/{assetId}/v{version}/{variant}.{ext}
--   avatars  {userId}/avatar{ext}
-- so `(storage.foldername(name))[1] = auth.uid()::text` is the whole rule. The
-- application derives that prefix from the session and never from a form, but
-- application code is not an access policy: without these, anyone holding the
-- anon key — which is public by design — could write anywhere in the bucket.
--
-- Reads are deliberately NOT opened to anon. A guest viewing a published
-- invitation is served by our own proxy route, which authorises the request and
-- then mints a 60-second signed URL with the service role
-- (services/upload/signed-read.ts). The bytes reach the guest re-served by us;
-- the signed URL never leaves the server. That is why a private bucket can feed
-- a public page without a public policy.

-- ---------------------------------------------------------------------------
-- media — private. Customer photographs and video.
-- ---------------------------------------------------------------------------

drop policy if exists "media: read own" on storage.objects;
create policy "media: read own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "media: write own" on storage.objects;
create policy "media: write own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Replace-an-asset writes v{n+1} and then deletes v{n}, so update and delete
-- are both part of the normal flow, not administrative operations.
drop policy if exists "media: update own" on storage.objects;
create policy "media: update own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "media: delete own" on storage.objects;
create policy "media: delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- avatars — public-read. A profile picture is shown beside a name.
-- Reads need no policy: a public bucket serves /object/public/... directly.
-- Writes still have to be the caller's own folder.
-- ---------------------------------------------------------------------------

drop policy if exists "avatars: write own" on storage.objects;
create policy "avatars: write own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars: update own" on storage.objects;
create policy "avatars: update own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "avatars: delete own" on storage.objects;
create policy "avatars: delete own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------------
-- template-assets — public-read admin artwork. No policies by design: it is
-- written only by the service role behind requireStaff(), and read publicly as
-- catalogue imagery. See lib/supabase/admin.ts for why that trade is acceptable
-- there and not here.
-- ---------------------------------------------------------------------------

-- Verify: expect 7 rows.
select policyname, cmd
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by policyname;
