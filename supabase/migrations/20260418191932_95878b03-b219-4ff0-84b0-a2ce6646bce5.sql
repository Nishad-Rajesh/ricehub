-- Drop overly broad SELECT policies on storage.objects for public buckets if they exist
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE schemaname = 'storage' AND tablename = 'objects'
      AND cmd = 'SELECT'
      AND (
        policyname ILIKE '%configs%public%' OR
        policyname ILIKE '%screenshots%public%' OR
        policyname ILIKE '%avatars%public%' OR
        policyname ILIKE 'Public read%' OR
        policyname ILIKE '%publicly accessible%' OR
        policyname ILIKE '%viewable by everyone%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Owner-only listing/select for each public bucket (folder convention: {user_id}/...)
CREATE POLICY "Owners can list configs"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'configs'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Owners can list screenshots"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'screenshots'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Owners can list avatars"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);