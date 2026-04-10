
DROP POLICY IF EXISTS "public_read_sop_media" ON storage.objects;
DROP POLICY IF EXISTS "public_upload_sop_media" ON storage.objects;
-- Allow anonymous uploads to sop-media bucket
CREATE POLICY "public_read_sop_media" ON storage.objects
    FOR SELECT USING (bucket_id = 'sop-media');

CREATE POLICY "anon_upload_sop_media" ON storage.objects
    FOR INSERT TO anon, authenticated
    WITH CHECK (bucket_id = 'sop-media');

CREATE POLICY "anon_delete_sop_media" ON storage.objects
    FOR DELETE TO anon, authenticated
    USING (bucket_id = 'sop-media');
