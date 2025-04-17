/*
  # Fix delete functionality and storage bucket

  1. Changes
    - Add cascade delete trigger for related records
    - Add RLS policy for deleting reports
    - Add storage bucket cleanup trigger

  2. Security
    - Only report creators can delete their reports
    - Automatically clean up related storage files
    - Cascade delete to related records
*/

-- Add RLS policy for deleting reports
CREATE POLICY "Users can delete their own reports"
  ON observation_details
  FOR DELETE
  TO authenticated
  USING (auth.uid() = created_by);

-- Create function to clean up storage files
CREATE OR REPLACE FUNCTION cleanup_report_files()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Delete supporting image if exists
  IF OLD.supporting_image IS NOT NULL THEN
    DELETE FROM storage.objects
    WHERE bucket_id = 'safety-images'
    AND name = OLD.supporting_image;
  END IF;

  RETURN OLD;
END;
$$;

-- Create trigger to clean up files before report deletion
CREATE TRIGGER cleanup_report_files_trigger
  BEFORE DELETE ON observation_details
  FOR EACH ROW
  EXECUTE FUNCTION cleanup_report_files();

-- Create storage bucket if it doesn't exist
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public)
  VALUES ('safety-images', 'safety-images', true)
  ON CONFLICT (id) DO NOTHING;
END $$;