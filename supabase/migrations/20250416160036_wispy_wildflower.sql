/*
  # Add monthly observation statistics table

  1. New Tables
    - `monthly_observation_stats`
      - Stores aggregated monthly statistics for observations
      - Includes total counts, types distribution, risk levels, etc.
      - Enables efficient reporting and trend analysis
  
  2. Security
    - Enable RLS
    - Add policy for authenticated users to view statistics
*/

CREATE TABLE monthly_observation_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  month DATE NOT NULL,
  total_observations INTEGER NOT NULL DEFAULT 0,
  observation_types JSONB NOT NULL DEFAULT '{}'::JSONB,
  action_status JSONB NOT NULL DEFAULT '{}'::JSONB,
  risk_levels JSONB NOT NULL DEFAULT '{}'::JSONB,
  trending_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_month UNIQUE (month)
);

-- Enable RLS
ALTER TABLE monthly_observation_stats ENABLE ROW LEVEL SECURITY;

-- Add RLS policies
CREATE POLICY "Monthly stats are viewable by authenticated users"
  ON monthly_observation_stats
  FOR SELECT
  TO authenticated
  USING (true);

-- Create function to update monthly stats
CREATE OR REPLACE FUNCTION update_monthly_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_month DATE;
BEGIN
  -- Get the month for the observation
  v_month := DATE_TRUNC('month', NEW.date)::DATE;

  -- Update or insert monthly stats
  INSERT INTO monthly_observation_stats (
    month,
    total_observations,
    observation_types,
    action_status,
    risk_levels,
    trending_data
  )
  VALUES (
    v_month,
    1,
    jsonb_build_object(NEW.report_group, 1),
    jsonb_build_object(NEW.status, 1),
    jsonb_build_object(NEW.consequences, 1),
    jsonb_build_object(
      'categories', '{}',
      'avg_response_time', 0
    )
  )
  ON CONFLICT (month) DO UPDATE
  SET
    total_observations = monthly_observation_stats.total_observations + 1,
    observation_types = monthly_observation_stats.observation_types || 
      jsonb_build_object(
        NEW.report_group, 
        COALESCE((monthly_observation_stats.observation_types->>NEW.report_group)::integer, 0) + 1
      ),
    action_status = monthly_observation_stats.action_status || 
      jsonb_build_object(
        NEW.status,
        COALESCE((monthly_observation_stats.action_status->>NEW.status)::integer, 0) + 1
      ),
    risk_levels = monthly_observation_stats.risk_levels || 
      jsonb_build_object(
        NEW.consequences,
        COALESCE((monthly_observation_stats.risk_levels->>NEW.consequences)::integer, 0) + 1
      ),
    updated_at = now();

  RETURN NEW;
END;
$$;

-- Create trigger to update stats on new observations
CREATE TRIGGER update_monthly_stats_trigger
  AFTER INSERT ON observation_details
  FOR EACH ROW
  EXECUTE FUNCTION update_monthly_stats();