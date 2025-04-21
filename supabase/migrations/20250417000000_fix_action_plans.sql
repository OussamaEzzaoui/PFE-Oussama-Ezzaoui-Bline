/*
  # Fix action_plans table structure

  1. Table Structure
    - Create action_plans table with proper columns
    - Add foreign key constraints
    - Add status check constraint
    - Add proper indexes

  2. Security
    - Enable Row Level Security (RLS)
    - Add policies for CRUD operations
    - Ensure proper user access control
*/

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create action_plans table if it doesn't exist
CREATE TABLE IF NOT EXISTS action_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    observation_id UUID NOT NULL REFERENCES observation_details(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    due_date DATE NOT NULL,
    responsible_person TEXT NOT NULL,
    follow_up_contact TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('open', 'closed')),
    created_by UUID NOT NULL REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add an index for better performance
CREATE INDEX IF NOT EXISTS idx_action_plans_observation_id ON action_plans(observation_id);

-- Enable RLS
ALTER TABLE action_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own action plans" ON action_plans;
DROP POLICY IF EXISTS "Users can insert their own action plans" ON action_plans;
DROP POLICY IF EXISTS "Users can update their own action plans" ON action_plans;
DROP POLICY IF EXISTS "Users can delete their own action plans" ON action_plans;

-- Add RLS policies
CREATE POLICY "Users can view their own action plans"
ON action_plans FOR SELECT
USING (auth.uid() = created_by);

CREATE POLICY "Users can insert their own action plans"
ON action_plans FOR INSERT
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can update their own action plans"
ON action_plans FOR UPDATE
USING (auth.uid() = created_by);

CREATE POLICY "Users can delete their own action plans"
ON action_plans FOR DELETE
USING (auth.uid() = created_by);

-- Grant necessary permissions
GRANT ALL ON action_plans TO authenticated;
GRANT USAGE ON SEQUENCE action_plans_id_seq TO authenticated; 