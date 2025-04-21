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
  report_status JSONB NOT NULL DEFAULT '{}'::JSONB,
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
  v_observation_types JSONB;
  v_report_status JSONB;
  v_risk_levels JSONB;
  v_trending_data JSONB;
BEGIN
  -- Get the month for the observation
  v_month := DATE_TRUNC('month', NEW.date)::DATE;

  -- Initialize JSONB objects with default values
  v_observation_types := jsonb_build_object(NEW.report_group, 1);
  v_report_status := jsonb_build_object(NEW.status, 1);
  v_risk_levels := jsonb_build_object(NEW.consequences, 1);
  v_trending_data := jsonb_build_object('categories', jsonb_build_object());

  -- Update or insert monthly stats
  INSERT INTO monthly_observation_stats (
    month,
    total_observations,
    observation_types,
    report_status,
    risk_levels,
    trending_data
  )
  VALUES (
    v_month,
    1,
    v_observation_types,
    v_report_status,
    v_risk_levels,
    v_trending_data
  )
  ON CONFLICT (month) DO UPDATE
  SET
    total_observations = monthly_observation_stats.total_observations + 1,
    observation_types = jsonb_set(
      COALESCE(monthly_observation_stats.observation_types, '{}'::jsonb),
      ARRAY[NEW.report_group],
      to_jsonb(COALESCE((monthly_observation_stats.observation_types->>NEW.report_group)::integer, 0) + 1)
    ),
    report_status = jsonb_set(
      COALESCE(monthly_observation_stats.report_status, '{}'::jsonb),
      ARRAY[NEW.status],
      to_jsonb(COALESCE((monthly_observation_stats.report_status->>NEW.status)::integer, 0) + 1)
    ),
    risk_levels = jsonb_set(
      COALESCE(monthly_observation_stats.risk_levels, '{}'::jsonb),
      ARRAY[NEW.consequences],
      to_jsonb(COALESCE((monthly_observation_stats.risk_levels->>NEW.consequences)::integer, 0) + 1)
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

-- Create a function to refresh all monthly stats
CREATE OR REPLACE FUNCTION refresh_monthly_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clear existing stats
  TRUNCATE monthly_observation_stats;

  -- Recalculate stats for all observations
  INSERT INTO monthly_observation_stats (
    month,
    total_observations,
    observation_types,
    report_status,
    risk_levels,
    trending_data
  )
  SELECT
    DATE_TRUNC('month', date)::DATE as month,
    COUNT(*) as total_observations,
    jsonb_object_agg(
      report_group,
      COUNT(*) FILTER (WHERE report_group = report_group)
    ) as observation_types,
    jsonb_object_agg(
      status,
      COUNT(*) FILTER (WHERE status = status)
    ) as report_status,
    jsonb_object_agg(
      consequences,
      COUNT(*) FILTER (WHERE consequences = consequences)
    ) as risk_levels,
    jsonb_build_object('categories', '{}'::jsonb) as trending_data
  FROM observation_details
  GROUP BY DATE_TRUNC('month', date)::DATE;
END;
$$;