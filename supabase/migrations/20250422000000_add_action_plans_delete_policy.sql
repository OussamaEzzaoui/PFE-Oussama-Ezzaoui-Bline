/*
  # Add delete policy for action_plans table

  1. Changes
    - Add RLS policy for deleting action plans
    - Only allow users to delete their own action plans
    - Ensure proper security context
*/

-- Enable RLS if not already enabled
ALTER TABLE action_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing delete policy if it exists
DROP POLICY IF EXISTS "Users can delete their own action plans" ON action_plans;

-- Create delete policy
CREATE POLICY "Users can delete their own action plans"
ON action_plans
FOR DELETE
TO authenticated
USING (auth.uid() = created_by);

-- Grant necessary permissions
GRANT DELETE ON action_plans TO authenticated; 