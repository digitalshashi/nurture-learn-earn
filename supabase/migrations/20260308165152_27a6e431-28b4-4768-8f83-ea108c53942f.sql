
-- Create storage bucket for course resources
INSERT INTO storage.buckets (id, name, public) VALUES ('course-resources', 'course-resources', true);

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated can upload course resources"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'course-resources');

-- Allow anyone to view/download files
CREATE POLICY "Anyone can view course resources"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-resources');

-- Allow owners to delete their files
CREATE POLICY "Authenticated can delete own course resources"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'course-resources' AND (storage.foldername(name))[1] = auth.uid()::text);
