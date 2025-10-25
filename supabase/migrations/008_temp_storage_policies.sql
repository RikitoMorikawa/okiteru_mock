-- Temporary: More permissive storage policies for testing
-- Drop existing policies
DROP POLICY IF EXISTS "photos_upload_policy" ON storage.objects;

DROP POLICY IF EXISTS "photos_select_policy" ON storage.objects;

DROP POLICY IF EXISTS "photos_update_policy" ON storage.objects;

DROP POLICY IF EXISTS "photos_delete_policy" ON storage.objects;

-- Create more permissive policies for authenticated users
CREATE POLICY "photos_upload_policy" ON storage.objects FOR
INSERT
WITH
    CHECK (
        bucket_id = 'photos'
        AND auth.role () = 'authenticated'
    );

CREATE POLICY "photos_select_policy" ON storage.objects FOR
SELECT USING (
        bucket_id = 'photos'
        AND auth.role () = 'authenticated'
    );

CREATE POLICY "photos_update_policy" ON storage.objects FOR
UPDATE USING (
    bucket_id = 'photos'
    AND auth.role () = 'authenticated'
);

CREATE POLICY "photos_delete_policy" ON storage.objects FOR DELETE USING (
    bucket_id = 'photos'
    AND auth.role () = 'authenticated'
);