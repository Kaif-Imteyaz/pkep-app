/*
  # Clean up authentication and data setup

  1. Changes
    - Remove test1@punjab.gov.in user and related data
    - Ensure proper buddy pairs (test+test2, test3+test4)
    - Maintain metrics data for remaining users
    - Fix authentication setup

  2. Security
    - Maintain all existing RLS policies
    - Keep user authentication data secure
*/

-- First, ensure we have the crypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  amitabh_id uuid;
  dharmendra_id uuid;
  rekha_id uuid;
  sridevi_id uuid;
BEGIN
  -- Clean up test1@punjab.gov.in
  DELETE FROM historical_metrics WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'test1@punjab.gov.in'
  );
  DELETE FROM dashboard_metrics WHERE user_id IN (
    SELECT id FROM auth.users WHERE email = 'test1@punjab.gov.in'
  );
  DELETE FROM buddy_pairs WHERE officer1_id IN (
    SELECT id FROM auth.users WHERE email = 'test1@punjab.gov.in'
  ) OR officer2_id IN (
    SELECT id FROM auth.users WHERE email = 'test1@punjab.gov.in'
  );
  DELETE FROM auth.users WHERE email = 'test1@punjab.gov.in';

  -- Get existing user IDs
  SELECT id INTO amitabh_id FROM auth.users WHERE email = 'test@punjab.gov.in';
  SELECT id INTO dharmendra_id FROM auth.users WHERE email = 'test2@punjab.gov.in';
  SELECT id INTO rekha_id FROM auth.users WHERE email = 'test3@punjab.gov.in';
  SELECT id INTO sridevi_id FROM auth.users WHERE email = 'test4@punjab.gov.in';

  -- Update authentication for remaining users
  UPDATE auth.users
  SET 
    encrypted_password = crypt('test123', gen_salt('bf')),
    email_confirmed_at = now(),
    raw_app_meta_data = jsonb_build_object(
      'provider', 'email',
      'providers', ARRAY['email']::text[],
      'email_confirmed', true
    ),
    raw_user_meta_data = '{}'::jsonb,
    updated_at = now(),
    last_sign_in_at = now(),
    aud = 'authenticated',
    role = 'authenticated'
  WHERE email IN ('test@punjab.gov.in', 'test2@punjab.gov.in', 'test3@punjab.gov.in', 'test4@punjab.gov.in');

  -- Recreate buddy pairs
  DELETE FROM buddy_pairs;
  INSERT INTO buddy_pairs (officer1_id, officer2_id)
  VALUES 
    (amitabh_id, dharmendra_id),
    (rekha_id, sridevi_id);
END $$;