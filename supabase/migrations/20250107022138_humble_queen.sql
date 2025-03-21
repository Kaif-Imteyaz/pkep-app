/*
  # Fix authentication users

  1. Changes
    - Recreates test users with proper authentication setup
    - Sets correct password hashing
    - Ensures email confirmation
*/

-- First, ensure we have the crypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  user_record RECORD;
BEGIN
  -- For each test email
  FOR user_record IN 
    SELECT email FROM auth.users 
    WHERE email LIKE 'test%@punjab.gov.in'
  LOOP
    -- Update user with proper authentication setup
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
      updated_at = now(),
      aud = 'authenticated',
      role = 'authenticated',
      instance_id = '00000000-0000-0000-0000-000000000000'
    WHERE email = user_record.email;
    
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
        raw_app_meta_data,
        raw_user_meta_data,
        created_at,
        updated_at
      ) VALUES (
        '00000000-0000-0000-0000-000000000000',
        gen_random_uuid(),
        'authenticated',
        'authenticated',
        user_record.email,
        crypt('test123', gen_salt('bf')),
        now(),
        jsonb_build_object(
          'provider', 'email',
          'providers', ARRAY['email'],
          'email_confirmed', true
        ),
        '{}'::jsonb,
        now(),
        now()
      );
    END IF;
  END LOOP;
END $$;