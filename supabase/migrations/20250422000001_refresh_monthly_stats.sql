-- Create a view for monthly stats
CREATE OR REPLACE VIEW monthly_stats_view AS
SELECT
  DATE_TRUNC('month', date)::DATE as month,
  COUNT(*) as total_count,
  report_group,
  status,
  consequences
FROM observation_details
GROUP BY 
  DATE_TRUNC('month', date)::DATE,
  report_group,
  status,
  consequences;

-- Create the refresh function
CREATE OR REPLACE FUNCTION refresh_monthly_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Clear existing stats
  TRUNCATE monthly_observation_stats;

  -- Insert aggregated data from the view
  INSERT INTO monthly_observation_stats (
    month,
    total_observations,
    observation_types,
    report_status,
    risk_levels,
    trending_data
  )
  SELECT DISTINCT
    month,
    SUM(total_count) OVER (PARTITION BY month),
    (
      SELECT jsonb_object_agg(report_group, total)
      FROM (
        SELECT report_group, SUM(total_count) as total
        FROM monthly_stats_view m2
        WHERE m2.month = m1.month
        GROUP BY report_group
      ) t
    ) as observation_types,
    (
      SELECT jsonb_object_agg(status, total)
      FROM (
        SELECT status, SUM(total_count) as total
        FROM monthly_stats_view m2
        WHERE m2.month = m1.month
        GROUP BY status
      ) t
    ) as report_status,
    (
      SELECT jsonb_object_agg(consequences, total)
      FROM (
        SELECT consequences, SUM(total_count) as total
        FROM monthly_stats_view m2
        WHERE m2.month = m1.month
        GROUP BY consequences
      ) t
    ) as risk_levels,
    jsonb_build_object('categories', '{}'::jsonb) as trending_data
  FROM monthly_stats_view m1;
END;
$$;

-- Execute the refresh function
SELECT refresh_monthly_stats(); 