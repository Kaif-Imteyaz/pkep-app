/*
  # Fix Authentication Setup
  
  This migration ensures proper authentication setup for test users by:
  1. Setting correct instance_id
  2. Adding required fields for auth
  3. Ensuring proper password encryption
*/

-- First, ensure we have the crypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  test_emails text[] := ARRAY['test@punjab.gov.in', 'test2@punjab.gov.in', 'test3@punjab.gov.in', 'test4@punjab.gov.in'];
  current_email text;
BEGIN
  -- For each test email
  FOREACH current_email IN ARRAY test_emails
  LOOP
    -- Update existing users with proper auth setup
    UPDATE auth.users
    SET 
      instance_id = '00000000-0000-0000-0000-000000000000',
      aud = 'authenticated',
      role = 'authenticated',
      encrypted_password = crypt('test123', gen_salt('bf')),
      email_confirmed_at = now(),
      confirmation_token = encode(gen_random_bytes(32), 'hex'),
      confirmation_sent_at = now(),
      recovery_token = encode(gen_random_bytes(32), 'hex'),
      raw_app_meta_data = jsonb_build_object(
        'provider', 'email',
        'providers', ARRAY['email']::text[],
        'email_confirmed', true
      ),
      raw_user_meta_data = '{}'::jsonb,
      is_super_admin = false,
      created_at = COALESCE(created_at, now()),
      updated_at = now(),
      last_sign_in_at = now()
    WHERE email = current_email;

    -- If user doesn't exist, create it
    IF NOT FOUND THEN
      INSERT INTO auth.users (
        instance_id,
        id,
        aud,
        role,
        email,
        encrypted_password,
        email_confirmed_at,
        confirmation_token,
        confirmation_sent_at,
        recovery_token,
        raw_app_meta_data,
        raw_user_meta_data,
        is_super_admin,
        created_at,
        updated_at,
        last_sign_in_at
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        current_email,
        crypt('test123', gen_salt('bf')),
        now(),
        encode(gen_random_bytes(32), 'hex'),
        now(),
        encode(gen_random_bytes(32), 'hex'),
        jsonb_build_object(
          'provider', 'email',
          'providers', ARRAY['email']::text[],
          'email_confirmed', true
        ),
        '{}'::jsonb,
        false,
        now(),
        now(),
        now()
      );
    END IF;
  END LOOP;
END $$;