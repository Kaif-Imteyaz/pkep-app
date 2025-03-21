/*
  # Fix user authentication
  
  This migration ensures all test users are properly configured with:
  - Correct password encryption
  - Email confirmation
  - Required metadata
  - Proper role and instance settings
*/

-- First, ensure we have the crypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  test_emails text[] := ARRAY['test@punjab.gov.in', 'test1@punjab.gov.in', 'test2@punjab.gov.in', 'test3@punjab.gov.in', 'test4@punjab.gov.in'];
  current_email text;
  current_user_id uuid;
BEGIN
  -- For each test email
  FOREACH current_email IN ARRAY test_emails
  LOOP
    -- Check if user exists
    SELECT id INTO current_user_id FROM auth.users WHERE email = current_email;
    
    IF current_user_id IS NULL THEN
      -- Create new user if doesn't exist
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at,
        last_sign_in_at,
        confirmation_token,
        recovery_token,
        email_change_token_current,
        email_change_token_new
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        current_email,
        crypt('test123', gen_salt('bf')),
        now(),
        jsonb_build_object(
          'provider', 'email',
          'providers', ARRAY['email']::text[],
          'email_confirmed', true
        ),
        '{}'::jsonb,
        now(),
        now(),
        now(),
        encode(gen_random_bytes(32), 'hex'),
        encode(gen_random_bytes(32), 'hex'),
        encode(gen_random_bytes(32), 'hex'),
        encode(gen_random_bytes(32), 'hex')
      );
    ELSE
      -- Update existing user
      UPDATE auth.users
      SET 
        instance_id = '00000000-0000-0000-0000-000000000000',
        aud = 'authenticated',
        role = 'authenticated',
        encrypted_password = crypt('test123', gen_salt('bf')),
        email_confirmed_at = now(),
        raw_app_meta_data = jsonb_build_object(
          'provider', 'email',
          'providers', ARRAY['email']::text[],
          'email_confirmed', true
        ),
        raw_user_meta_data = '{}'::jsonb,
        updated_at = now(),
        last_sign_in_at = now()
      WHERE id = current_user_id;
    END IF;
  END LOOP;
END $$;