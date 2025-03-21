/*
  # Add dashboard metrics table

  1. New Tables
    - `dashboard_metrics`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `delayed_applications` (numeric)
      - `process_days` (numeric)
      - `applications_handled` (integer)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `dashboard_metrics` table
    - Add policies for authenticated users to read their own data
*/

CREATE TABLE dashboard_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  delayed_applications numeric NOT NULL,
  process_days numeric NOT NULL,
  applications_handled integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE dashboard_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own metrics"
  ON dashboard_metrics
  FOR SELECT
  USING (auth.uid() = user_id);

-- Insert dummy data with a DO block to handle the user ID safely
DO $$
DECLARE
  test_user_id uuid;
BEGIN
  SELECT id INTO test_user_id FROM auth.users WHERE email = 'test@punjab.gov.in' LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    INSERT INTO dashboard_metrics (user_id, delayed_applications, process_days, applications_handled)
    VALUES (test_user_id, 2.75, 3.2, 145);
  END IF;
END $$;