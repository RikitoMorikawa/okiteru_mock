-- Drop existing storage policies
DROP POLICY IF EXISTS "photos_upload_policy" ON storage.objects;

DROP POLICY IF EXISTS "photos_select_policy" ON storage.objects;

DROP POLICY IF EXISTS "photos_update_policy" ON storage.objects;

DROP POLICY IF EXISTS "photos_delete_policy" ON storage.objects;

-- Create new storage policies with correct path structure
-- Path structure: photos/route/{user_id}/{date}/filename or photos/appearance/{user_id}/{date}/filename

-- Staff can upload their own photos, managers can upload for any staff
CREATE POLICY "photos_upload_policy" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'photos' AND (
            is_manager(auth.uid()) OR 
            (auth.uid()::text = (storage.foldername(name))[2])
        )
    );

-- Staff can view their own photos, managers can view all photos
CREATE POLICY "photos_select_policy" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'photos' AND (
            is_manager(auth.uid()) OR 
            (auth.uid()::text = (storage.foldername(name))[2])
        )
    );

-- Staff can update their own photos, managers can update any photos
CREATE POLICY "photos_update_policy" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'photos' AND (
            is_manager(auth.uid()) OR 
            (auth.uid()::text = (storage.foldername(name))[2])
        )
    );

-- Only managers can delete photos
CREATE POLICY "photos_delete_policy" ON storage.objects FOR DELETE USING (
    bucket_id = 'photos'
    AND is_manager (auth.uid ())
);