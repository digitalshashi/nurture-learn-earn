
-- Add thumbnail_url and video_description to chapters
ALTER TABLE public.chapters
  ADD COLUMN IF NOT EXISTS thumbnail_url text,
  ADD COLUMN IF NOT EXISTS video_description text;

-- Create storage bucket for course videos and thumbnails
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('course-videos', 'course-videos', true, 2147483648)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for course-videos bucket
CREATE POLICY "Authenticated users can upload course videos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'course-videos');

CREATE POLICY "Authenticated users can update course videos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'course-videos');

CREATE POLICY "Authenticated users can delete course videos"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'course-videos');

CREATE POLICY "Anyone can view course videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'course-videos');
