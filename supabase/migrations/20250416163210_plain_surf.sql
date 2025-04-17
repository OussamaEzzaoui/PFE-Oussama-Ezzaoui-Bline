/*
  # Create safety images storage bucket

  1. Changes
    - Creates a new storage bucket named 'safety-images' for storing safety report images
    - Enables public read access for the bucket
    - Sets up RLS policies for image uploads

  2. Security
    - Authenticated users can upload images
    - Public read access for viewing images
    - Images are associated with safety reports
*/

-- Create the storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('safety-images', 'safety-images', true);

-- Enable RLS
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policy to allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload safety images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'safety-images'
);

-- Create policy to allow public to read images
CREATE POLICY "Public can view safety images"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'safety-images'
);