/*
  # Cleanup duplicate migrations and consolidate save_observation function

  1. Cleanup
    - Remove duplicate save_observation function definitions
    - Consolidate all changes into a single, clean function definition
    - Ensure proper error handling and validation
    - Set up proper security permissions

  2. Security
    - Function runs with SECURITY DEFINER
    - Input validation for required fields
    - Proper error handling and reporting
    - Execute permission granted to authenticated users only
*/

-- Drop all existing versions of the function
DROP FUNCTION IF EXISTS save_observation(JSON, JSON, UUID);
DROP FUNCTION IF EXISTS save_observation(JSON, UUID, JSON);

-- Create a single, consolidated version of the function
CREATE OR REPLACE FUNCTION save_observation(
  p_observation JSON,
  p_user_id UUID,
  p_action_plans JSON DEFAULT NULL
) RETURNS JSON AS $$
DECLARE
  v_result RECORD;
  v_observation_id UUID;
BEGIN
  -- Validate required fields
  IF p_observation->>'project_id' IS NULL THEN
    RAISE EXCEPTION 'project_id is required';
  END IF;

  IF p_observation->>'company_id' IS NULL THEN
    RAISE EXCEPTION 'company_id is required';
  END IF;

  IF p_observation->>'submitter_name' IS NULL THEN
    RAISE EXCEPTION 'submitter_name is required';
  END IF;

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
    COALESCE((p_observation->>'date')::DATE, CURRENT_DATE),
    COALESCE((p_observation->>'time')::TIME, CURRENT_TIME),
    NULLIF(p_observation->>'department', ''),
    p_observation->>'location',
    p_observation->>'description',
    p_observation->>'report_group',
    p_observation->>'consequences',
    p_observation->>'likelihood',
    COALESCE(p_observation->>'status', 'open'),
    p_observation->>'subject',
    COALESCE((p_observation->>'corrective_action')::BOOLEAN, false),
    NULLIF(p_observation->>'supporting_image', ''),
    p_user_id
  )
  RETURNING id INTO v_observation_id;

  -- Handle action plans if provided
  IF p_action_plans IS NOT NULL THEN
    -- Delete existing action plans for this observation
    DELETE FROM action_plans WHERE observation_id = v_observation_id;
    
    -- Insert new action plans
    INSERT INTO action_plans (
      observation_id,
      action,
      due_date,
      responsible_person,
      follow_up_contact,
      status,
      created_by
    )
    SELECT 
      v_observation_id,
      (plan->>'action')::TEXT,
      (plan->>'due_date')::DATE,
      (plan->>'responsible_person')::TEXT,
      (plan->>'follow_up_contact')::TEXT,
      COALESCE((plan->>'status')::TEXT, 'open'),
      p_user_id
    FROM json_array_elements(p_action_plans) AS plan;
  END IF;

  -- Get the complete result
  SELECT * INTO v_result FROM observation_details WHERE id = v_observation_id;

  -- Return the result as JSON
  RETURN row_to_json(v_result);
EXCEPTION
  WHEN others THEN
    RAISE EXCEPTION 'Failed to save observation: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION save_observation(JSON, UUID, JSON) TO authenticated; 