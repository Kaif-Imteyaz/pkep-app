/*
  # Set up buddy system and create additional users

  1. New Tables
    - `buddy_pairs`: Tracks officer buddy relationships
      - `id` (uuid, primary key)
      - `officer1_id` (uuid, references auth.users)
      - `officer2_id` (uuid, references auth.users)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on buddy_pairs table
    - Add policy for users to read their buddy pairs
*/

-- Create buddy pairs table
CREATE TABLE buddy_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  officer1_id uuid REFERENCES auth.users NOT NULL,
  officer2_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE buddy_pairs ENABLE ROW LEVEL SECURITY;

-- Allow users to read their buddy pairs
CREATE POLICY "Users can read their buddy pairs"
  ON buddy_pairs
  FOR SELECT
  USING (auth.uid() = officer1_id OR auth.uid() = officer2_id);

-- Insert dummy data for additional officers and their metrics
DO $$
DECLARE
  dharmendra_id uuid := gen_random_uuid();
  rekha_id uuid := gen_random_uuid();
  sridevi_id uuid := gen_random_uuid();
  amitabh_id uuid;
BEGIN
  -- Get Amitabh's ID
  SELECT id INTO amitabh_id FROM auth.users WHERE email = 'test@punjab.gov.in';

  -- Create other officers
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data
  ) VALUES 
    (dharmendra_id, 'test2@punjab.gov.in', crypt('test123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb),
    (rekha_id, 'test3@punjab.gov.in', crypt('test123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb),
    (sridevi_id, 'test4@punjab.gov.in', crypt('test123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb);

  -- Create buddy pairs
  INSERT INTO buddy_pairs (officer1_id, officer2_id)
  VALUES 
    (amitabh_id, dharmendra_id),
    (rekha_id, sridevi_id);

  -- Insert dashboard metrics for new officers
  INSERT INTO dashboard_metrics (user_id, delayed_applications, process_days, applications_handled)
  VALUES 
    (dharmendra_id, 3.1, 2.9, 132),
    (rekha_id, 2.2, 3.5, 158),
    (sridevi_id, 2.8, 3.0, 140);

  -- Insert historical metrics for new officers
  FOR i IN 1..6 LOOP
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