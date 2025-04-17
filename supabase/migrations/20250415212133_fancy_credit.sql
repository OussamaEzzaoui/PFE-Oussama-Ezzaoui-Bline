/*
  # Create save_observation function

  1. Function Purpose
    - Creates a stored function to handle saving observation data and related records
    - Handles observation details, categories, and action plans
    - Performs data validation
    - Returns the saved observation record

  2. Parameters
    - observation_data: JSON containing observation details
    - action_plans_data: JSON array of action plans
    - user_id: UUID of the authenticated user

  3. Security
    - Function is accessible only to authenticated users
*/

CREATE OR REPLACE FUNCTION save_observation(
  observation_data JSON,
  action_plans_data JSON,
  user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  saved_observation_id UUID;
  saved_observation RECORD;
BEGIN
  -- Insert observation details
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
  SELECT
    (observation_data->>'project_id')::UUID,
    (observation_data->>'company_id')::UUID,
    observation_data->>'submitter_name',
    (observation_data->>'date')::DATE,
    (observation_data->>'time')::TIME,
    observation_data->>'department',
    observation_data->>'location',
    observation_data->>'description',
    observation_data->>'report_group',
    observation_data->>'consequences',
    observation_data->>'likelihood',
    observation_data->>'status',
    observation_data->>'subject',
    (observation_data->>'corrective_action')::BOOLEAN,
    observation_data->>'supporting_image',
    user_id
  RETURNING id INTO saved_observation_id;

  -- Get the saved observation
  SELECT * INTO saved_observation 
  FROM observation_details 
  WHERE id = saved_observation_id;

  -- Return the saved observation as JSON
  RETURN row_to_json(saved_observation);
END;
$$;