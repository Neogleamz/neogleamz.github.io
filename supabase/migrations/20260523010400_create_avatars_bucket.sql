-- Create avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- RLS for avatars bucket
-- 1. Allow public to select/read avatars
CREATE POLICY "public_read_avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'avatars');

-- 2. Allow authenticated users to upload/insert avatars
CREATE POLICY "auth_upload_avatars" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'avatars');

-- 3. Allow authenticated users to update avatars
CREATE POLICY "auth_update_avatars" ON storage.objects
    FOR UPDATE TO authenticated
    USING (bucket_id = 'avatars');

-- 4. Allow authenticated users to delete avatars
CREATE POLICY "auth_delete_avatars" ON storage.objects
    FOR DELETE TO authenticated
    USING (bucket_id = 'avatars');
