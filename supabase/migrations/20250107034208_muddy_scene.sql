/*
  # Fix authentication setup

  1. Changes
    - Reset authentication for all test users
    - Ensure all required auth fields are properly set
    - Fix NULL handling for email_change fields
*/

DO $$
DECLARE
  test_emails text[] := ARRAY['test@punjab.gov.in', 'test2@punjab.gov.in', 'test3@punjab.gov.in', 'test4@punjab.gov.in'];
  current_email text;
BEGIN
  -- For each test email
  FOREACH current_email IN ARRAY test_emails
  LOOP
    -- Update users with complete auth setup
    UPDATE auth.users
    SET 
      encrypted_password = crypt('test123', gen_salt('bf')),
      email_confirmed_at = now(),
      confirmation_token = encode(gen_random_bytes(32), 'hex'),
      recovery_token = encode(gen_random_bytes(32), 'hex'),
      email_change = '',
      email_change_token_new = encode(gen_random_bytes(32), 'hex'),
      email_change_token_current = encode(gen_random_bytes(32), 'hex'),
      email_change_confirm_status = 0,
      raw_app_meta_data = jsonb_build_object(
        'provider', 'email',
        'providers', ARRAY['email']::text[],
        'email_confirmed', true
      ),
      raw_user_meta_data = '{}'::jsonb,
      aud = 'authenticated',
      role = 'authenticated',
      updated_at = now(),
      last_sign_in_at = now()
    WHERE email = current_email;
  END LOOP;
END $$;