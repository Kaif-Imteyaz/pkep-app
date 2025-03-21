/*
  # Fix user confirmation status

  1. Changes
    - Updates email confirmation status for test users
    - Updates metadata to indicate email confirmation
*/

DO $$
BEGIN
  -- Update only the email confirmation and metadata
  UPDATE auth.users
  SET 
    email_confirmed_at = now(),
    raw_app_meta_data = raw_app_meta_data || '{"email_confirmed": true}'::jsonb
  WHERE email LIKE 'test%@punjab.gov.in';
END $$;