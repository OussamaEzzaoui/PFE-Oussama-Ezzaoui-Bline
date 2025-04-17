/*
  # Add supporting_image column to action_plans table

  1. Changes
    - Add supporting_image column to action_plans table
    - Column is nullable and stores image path/URL
    - Safe addition using DO block
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'action_plans' 
    AND column_name = 'supporting_image'
  ) THEN
    ALTER TABLE action_plans 
    ADD COLUMN supporting_image text;
  END IF;
END $$;