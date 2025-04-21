/*
  # Repair migration history after removing duplicates

  This migration repairs the migration history table after removing duplicate migrations.
  It marks the removed migrations as reverted and ensures the history is consistent.
*/

-- Mark the removed migrations as reverted
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES 
  ('20250415213311', 'frosty_pine', ARRAY['-- Migration reverted due to consolidation']),
  ('20250415213354', 'frosty_sky', ARRAY['-- Migration reverted due to consolidation']),
  ('20250415224620', 'quick_summit', ARRAY['-- Migration reverted due to consolidation']),
  ('20250415224646', 'odd_manor', ARRAY['-- Migration reverted due to consolidation'])
ON CONFLICT (version) DO UPDATE SET statements = EXCLUDED.statements;

-- Update the migration history to mark these as reverted
UPDATE supabase_migrations.schema_migrations
SET statements = ARRAY['-- Migration reverted due to consolidation']
WHERE version IN (
  '20250415213311',
  '20250415213354',
  '20250415224620',
  '20250415224646'
); 