-- Create storage bucket for action plan images
INSERT INTO storage.buckets (id, name, public)
VALUES ('action-plan-images', 'action-plan-images', true);

-- Set up storage policies for action plan images
CREATE POLICY "Allow authenticated users to upload action plan images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'action-plan-images' AND
  auth.uid() = (storage.foldername(name))[1]::uuid
);

CREATE POLICY "Allow authenticated users to view action plan images"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'action-plan-images');

CREATE POLICY "Allow authenticated users to delete their own action plan images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'action-plan-images' AND
  auth.uid() = (storage.foldername(name))[1]::uuid
); 