/*
  # Add missing test users
  
  1. Changes
    - Safely adds test users if they don't already exist
*/

DO $$
DECLARE
  user_exists boolean;
BEGIN
  -- Check and create test2@punjab.gov.in
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'test2@punjab.gov.in'
  ) INTO user_exists;
  
  IF NOT user_exists THEN
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
      'test2@punjab.gov.in',
      crypt('test123', gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    );
  END IF;

  -- Repeat for test3@punjab.gov.in
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'test3@punjab.gov.in'
  ) INTO user_exists;
  
  IF NOT user_exists THEN
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
      'test3@punjab.gov.in',
      crypt('test123', gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    );
  END IF;

  -- Repeat for test4@punjab.gov.in
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE email = 'test4@punjab.gov.in'
  ) INTO user_exists;
  
  IF NOT user_exists THEN
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
      'test4@punjab.gov.in',
      crypt('test123', gen_salt('bf')),
      now(),
      '{"provider": "email", "providers": ["email"]}'::jsonb,
      '{}'::jsonb,
      now(),
      now()
    );
  END IF;
END $$;