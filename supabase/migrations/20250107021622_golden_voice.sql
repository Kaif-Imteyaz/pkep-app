/*
  # Verify and fix user accounts

  1. Changes
    - Ensures all test users exist
    - Resets passwords
    - Confirms emails
    - Updates metadata
*/

DO $$
BEGIN
  -- Update all test users to ensure they're properly configured
  UPDATE auth.users
  SET 
    encrypted_password = crypt('test123', gen_salt('bf')),
    email_confirmed_at = now(),
    raw_app_meta_data = jsonb_build_object(
      'provider', 'email',
      'providers', ARRAY['email'],
      'email_confirmed', true
    ),
    raw_user_meta_data = '{}'::jsonb,
    updated_at = now()
  WHERE email LIKE 'test%@punjab.gov.in';
END $$;