/*
  # Add observation categories table

  1. New Tables
    - `observation_categories`
      - `observation_id` (uuid, foreign key to observation_details)
      - `category_id` (uuid, foreign key to safety_categories)
      - Composite primary key of both columns
  
  2. Security
    - Enable RLS
    - Add policy for authenticated users to manage their own categories
*/

-- Create observation_categories table
CREATE TABLE IF NOT EXISTS observation_categories (
  observation_id UUID NOT NULL REFERENCES observation_details(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES safety_categories(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (observation_id, category_id)
);

-- Enable RLS
ALTER TABLE observation_categories ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Users can manage their observation categories"
  ON observation_categories
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM observation_details
      WHERE observation_details.id = observation_categories.observation_id
      AND observation_details.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM observation_details
      WHERE observation_details.id = observation_categories.observation_id
      AND observation_details.created_by = auth.uid()
    )
  );