/*
  # Restore Database Schema and Data

  1. Tables Created
    - notes (for reflection board)
    - dashboard_metrics (for performance metrics)
    - historical_metrics (for trend data)
    - buddy_pairs (for officer partnerships)
    
  2. Data Restored
    - Test users (Amitabh, Dharmendra, Rekha, Sridevi)
    - Dashboard metrics for each user
    - Historical metrics for trends
    - Buddy pair relationships
*/

-- Create type if it doesn't exist
DO $$ BEGIN
  CREATE TYPE note_type AS ENUM ('rose', 'thorn', 'bud');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Recreate notes table if it doesn't exist
CREATE TABLE IF NOT EXISTS notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  type note_type NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Recreate dashboard_metrics if it doesn't exist
CREATE TABLE IF NOT EXISTS dashboard_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  delayed_applications numeric NOT NULL,
  process_days numeric NOT NULL,
  applications_handled integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Recreate historical_metrics if it doesn't exist
CREATE TABLE IF NOT EXISTS historical_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  metric_type text NOT NULL,
  value numeric NOT NULL,
  month date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Recreate buddy_pairs if it doesn't exist
CREATE TABLE IF NOT EXISTS buddy_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  officer1_id uuid REFERENCES auth.users NOT NULL,
  officer2_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dashboard_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE historical_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE buddy_pairs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Anyone can read notes" ON notes;
DROP POLICY IF EXISTS "Users can create their own notes" ON notes;
DROP POLICY IF EXISTS "Users can update their own notes" ON notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON notes;
DROP POLICY IF EXISTS "Users can read own metrics" ON dashboard_metrics;
DROP POLICY IF EXISTS "Users can read own historical metrics" ON historical_metrics;
DROP POLICY IF EXISTS "Users can read their buddy pairs" ON buddy_pairs;

-- Create policies
CREATE POLICY "Anyone can read notes"
  ON notes FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own notes"
  ON notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON notes FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own metrics"
  ON dashboard_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read own historical metrics"
  ON historical_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can read their buddy pairs"
  ON buddy_pairs FOR SELECT
  USING (auth.uid() = officer1_id OR auth.uid() = officer2_id);

-- Restore data
DO $$
DECLARE
  amitabh_id uuid;
  dharmendra_id uuid;
  rekha_id uuid;
  sridevi_id uuid;
BEGIN
  -- Get user IDs
  SELECT id INTO amitabh_id FROM auth.users WHERE email = 'test@punjab.gov.in';
  SELECT id INTO dharmendra_id FROM auth.users WHERE email = 'test2@punjab.gov.in';
  SELECT id INTO rekha_id FROM auth.users WHERE email = 'test3@punjab.gov.in';
  SELECT id INTO sridevi_id FROM auth.users WHERE email = 'test4@punjab.gov.in';

  -- Recreate dashboard metrics
  INSERT INTO dashboard_metrics (user_id, delayed_applications, process_days, applications_handled)
  VALUES 
    (amitabh_id, 2.75, 3.2, 145),
    (dharmendra_id, 3.1, 2.9, 132),
    (rekha_id, 2.2, 3.5, 158),
    (sridevi_id, 2.8, 3.0, 140)
  ON CONFLICT DO NOTHING;

  -- Create buddy pairs
  INSERT INTO buddy_pairs (officer1_id, officer2_id)
  VALUES 
    (amitabh_id, dharmendra_id),
    (rekha_id, sridevi_id)
  ON CONFLICT DO NOTHING;

  -- Insert historical metrics
  FOR i IN 1..6 LOOP
    -- Amitabh's metrics
    INSERT INTO historical_metrics (user_id, metric_type, value, month)
    VALUES 
      (amitabh_id, 'delayed_applications', 2.75 + (random() * 0.5 - 0.25), date_trunc('month', now() - ((i-1) || ' month')::interval)),
      (amitabh_id, 'process_days', 3.2 + (random() * 0.5 - 0.25), date_trunc('month', now() - ((i-1) || ' month')::interval));

    -- Dharmendra's metrics
    INSERT INTO historical_metrics (user_id, metric_type, value, month)
    VALUES 
      (dharmendra_id, 'delayed_applications', 3.1 + (random() * 0.5 - 0.25), date_trunc('month', now() - ((i-1) || ' month')::interval)),
      (dharmendra_id, 'process_days', 2.9 + (random() * 0.5 - 0.25), date_trunc('month', now() - ((i-1) || ' month')::interval));

    -- Rekha's metrics
    INSERT INTO historical_metrics (user_id, metric_type, value, month)
    VALUES 
      (rekha_id, 'delayed_applications', 2.2 + (random() * 0.5 - 0.25), date_trunc('month', now() - ((i-1) || ' month')::interval)),
      (rekha_id, 'process_days', 3.5 + (random() * 0.5 - 0.25), date_trunc('month', now() - ((i-1) || ' month')::interval));

    -- Sridevi's metrics
    INSERT INTO historical_metrics (user_id, metric_type, value, month)
    VALUES 
      (sridevi_id, 'delayed_applications', 2.8 + (random() * 0.5 - 0.25), date_trunc('month', now() - ((i-1) || ' month')::interval)),
      (sridevi_id, 'process_days', 3.0 + (random() * 0.5 - 0.25), date_trunc('month', now() - ((i-1) || ' month')::interval));
  END LOOP;
END $$;