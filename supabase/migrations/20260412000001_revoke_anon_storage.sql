-- ==============================================
-- SECURITY HOTFIX: REVOKE ANON STORAGE BUCKET ACCESS
-- ==============================================
-- Discovered during sitewide security audit.
-- The previous policy inherently allowed public users
-- to insert and delete inside the sop-media bucket without
-- authentication. This locks it back down to logged-in users.

DROP POLICY IF EXISTS "anon_upload_sop_media" ON storage.objects;
DROP POLICY IF EXISTS "public_upload_sop_media" ON storage.objects;
DROP POLICY IF EXISTS "anon_delete_sop_media" ON storage.objects;
DROP POLICY IF EXISTS "public_read_sop_media" ON storage.objects;

-- Re-enable reading for all (SOPs are internal but images might be rendered publicly if needed, though authenticating to read is better. Safe default: auth read)
DROP POLICY IF EXISTS "auth_read_sop_media" ON storage.objects;
CREATE POLICY "auth_read_sop_media" ON storage.objects
    FOR SELECT TO authenticated USING (bucket_id = 'sop-media');

DROP POLICY IF EXISTS "auth_upload_sop_media" ON storage.objects;
CREATE POLICY "auth_upload_sop_media" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'sop-media');

DROP POLICY IF EXISTS "auth_delete_sop_media" ON storage.objects;
CREATE POLICY "auth_delete_sop_media" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'sop-media');
