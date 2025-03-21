/*
  # Fix user passwords

  1. Changes
    - Updates passwords for all test users to ensure they work with authentication
*/

DO $$
BEGIN
  -- Update passwords for all test users
  UPDATE auth.users
  SET 
    encrypted_password = crypt('test123', gen_salt('bf')),
    raw_app_meta_data = raw_app_meta_data || '{"email_confirmed": true}'::jsonb
  WHERE email LIKE 'test%@punjab.gov.in';
END $$;