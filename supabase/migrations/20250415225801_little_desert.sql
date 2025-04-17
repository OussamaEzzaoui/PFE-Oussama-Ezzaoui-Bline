/*
  # Add subject column to observation_details table

  1. Changes
    - Add 'subject' column to observation_details table
      - Type: text
      - Not nullable
      - Check constraint to ensure valid values (SOR, SOP, RES)
      - Default value: 'SOR'

  2. Notes
    - Uses DO block for safe column addition
    - Adds check constraint to validate subject values
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'observation_details' 
    AND column_name = 'subject'
  ) THEN
    ALTER TABLE observation_details 
    ADD COLUMN subject text NOT NULL DEFAULT 'SOR';

    ALTER TABLE observation_details
    ADD CONSTRAINT subject_check 
    CHECK (subject IN ('SOR', 'SOP', 'RES'));
  END IF;
END $$;