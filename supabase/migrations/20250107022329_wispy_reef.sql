/*
  # Fix user authentication setup with proper cleanup
  
  1. Changes
    - Deletes related records in correct order (dashboard_metrics, notes, users)
    - Uses explicit table aliases
    - Handles all foreign key constraints
*/

-- First, ensure we have the crypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  test_emails text[] := ARRAY['test@punjab.gov.in', 'test2@punjab.gov.in', 'test3@punjab.gov.in', 'test4@punjab.gov.in'];
  current_email text;
  current_user_id uuid;
BEGIN
  -- For each test email
  FOREACH current_email IN ARRAY test_emails
  LOOP
    -- Get user id if exists
    SELECT id INTO current_user_id FROM auth.users WHERE email = current_email;
    
    -- Delete associated records first if user exists
    IF current_user_id IS NOT NULL THEN
      DELETE FROM dashboard_metrics d WHERE d.user_id = current_user_id;
      DELETE FROM historical_metrics h WHERE h.user_id = current_user_id;
      DELETE FROM notes n WHERE n.user_id = current_user_id;
      DELETE FROM buddy_pairs b WHERE b.officer1_id = current_user_id OR b.officer2_id = current_user_id;
      DELETE FROM auth.users u WHERE u.id = current_user_id;
    END IF;
    
    -- Create new user with proper setup
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
      confirmation_token
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
      encode(gen_random_bytes(32), 'hex')
    );
  END LOOP;
END $$;