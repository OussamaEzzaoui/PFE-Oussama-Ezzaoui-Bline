/*
  # Update report_group check constraint

  1. Changes
    - Drop existing report_group check constraint
    - Add new check constraint to allow 'finding' and 'positive' values
    - Update existing data to use new values
*/

-- Drop existing constraint if it exists
ALTER TABLE observation_details
DROP CONSTRAINT IF EXISTS report_group_check;

-- Add new constraint using ANY array syntax
ALTER TABLE observation_details
ADD CONSTRAINT report_group_check
CHECK (report_group = ANY (ARRAY['finding'::text, 'positive'::text]));

-- Update existing data
UPDATE observation_details
SET report_group = 'finding'
WHERE report_group = ANY (ARRAY['operations'::text, 'maintenance'::text, 'safety'::text, 'contractors'::text]); 