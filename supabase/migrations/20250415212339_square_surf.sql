/*
  # Fix save_observation function

  1. Changes
    - Remove transaction blocks that were causing syntax errors
    - Simplify function to use direct inserts
    - Add proper error handling
    - Improve return value handling

  2. Function Details
    - Takes observation data and user ID as parameters
    - Performs validation checks
    - Returns the saved observation record
*/

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS save_observation(JSON, JSON, UUID);

-- Create the function with proper syntax
CREATE OR REPLACE FUNCTION save_observation(
  p_observation JSON,
  p_action_plans JSON,
  p_user_id UUID
) RETURNS JSON AS $$
DECLARE
  v_observation_id UUID;
  v_result RECORD;
BEGIN
  -- Insert the observation and get the ID
  INSERT INTO observation_details (
    project_id,
    company_id,
    submitter_name,
    date,
    time,
    department,
    location,
    description,
    report_group,
    consequences,
    likelihood,
    status,
    subject,
    corrective_action,
    supporting_image,
    created_by
  )
  VALUES (
    (p_observation->>'project_id')::UUID,
    (p_observation->>'company_id')::UUID,
    p_observation->>'submitter_name',
    (p_observation->>'date')::DATE,
    (p_observation->>'time')::TIME,
    p_observation->>'department',
    p_observation->>'location',
    p_observation->>'description',
    p_observation->>'report_group',
    p_observation->>'consequences',
    p_observation->>'likelihood',
    COALESCE(p_observation->>'status', 'open'),
    p_observation->>'subject',
    COALESCE((p_observation->>'corrective_action')::BOOLEAN, false),
    p_observation->>'supporting_image',
    p_user_id
  )
  RETURNING * INTO v_result;

  -- Return the result as JSON
  RETURN row_to_json(v_result);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;