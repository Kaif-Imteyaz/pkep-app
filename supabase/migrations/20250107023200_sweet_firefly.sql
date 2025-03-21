/*
  # Fix database schema and policies
  
  This migration ensures all tables and policies are properly configured
  with correct error handling.
*/

-- First, ensure we have the crypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Safely create or update policies using DO block
DO $$
BEGIN
  -- Drop existing policies first to avoid conflicts
  DROP POLICY IF EXISTS "Anyone can read notes" ON notes;
  DROP POLICY IF EXISTS "Users can create their own notes" ON notes;
  DROP POLICY IF EXISTS "Users can update their own notes" ON notes;
  DROP POLICY IF EXISTS "Users can delete their own notes" ON notes;
  DROP POLICY IF EXISTS "Users can read own metrics" ON dashboard_metrics;
  DROP POLICY IF EXISTS "Users can read own historical metrics" ON historical_metrics;
  DROP POLICY IF EXISTS "Users can read their buddy pairs" ON buddy_pairs;

  -- Create new policies
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
END $$;