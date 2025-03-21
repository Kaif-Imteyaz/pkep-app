/*
  # Add test1@punjab.gov.in user
  
  This migration adds a new test user with proper authentication setup and necessary data.
*/

-- First, ensure we have the crypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
  new_user_id uuid;
  buddy_id uuid;
BEGIN
  -- Create new user with proper auth setup
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
    'test1@punjab.gov.in',
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
  )
  RETURNING id INTO new_user_id;

  -- Generate random buddy
  SELECT id INTO buddy_id 
  FROM auth.users 
  WHERE email != 'test1@punjab.gov.in' 
  ORDER BY random() 
  LIMIT 1;

  -- Create buddy pair
  INSERT INTO buddy_pairs (officer1_id, officer2_id)
  VALUES (new_user_id, buddy_id);

  -- Add dashboard metrics
  INSERT INTO dashboard_metrics (
    user_id, 
    delayed_applications, 
    process_days, 
    applications_handled
  ) VALUES (
    new_user_id,
    2.9,
    3.1,
    138
  );

  -- Add historical metrics
  FOR i IN 1..6 LOOP
    INSERT INTO historical_metrics (
      user_id, 
      metric_type, 
      value, 
      month
    ) VALUES 
      (
        new_user_id,
        'delayed_applications',
        2.9 + (random() * 0.5 - 0.25),
        date_trunc('month', now() - ((i-1) || ' month')::interval)
      ),
      (
        new_user_id,
        'process_days',
        3.1 + (random() * 0.5 - 0.25),
        date_trunc('month', now() - ((i-1) || ' month')::interval)
      );
  END LOOP;
END $$;