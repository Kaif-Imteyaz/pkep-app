/*
  # Fix dashboard metrics data

  1. Changes
    - Clear existing metrics
    - Re-add metrics for all test users
    - Ensure correct user IDs are used
*/

DO $$
DECLARE
  amitabh_id uuid;
  dharmendra_id uuid;
  rekha_id uuid;
  sridevi_id uuid;
BEGIN
  -- Get user IDs
  SELECT id INTO amitabh_id FROM auth.users WHERE email = 'test@punjab.gov.in';
  SELECT id INTO dharmendra_id FROM auth.users WHERE email = 'test2@punjab.gov.in';
  SELECT id INTO rekha_id FROM auth.users WHERE email = 'test3@punjab.gov.in';
  SELECT id INTO sridevi_id FROM auth.users WHERE email = 'test4@punjab.gov.in';

  -- Clear existing metrics
  DELETE FROM dashboard_metrics;
  DELETE FROM historical_metrics;
  DELETE FROM buddy_pairs;

  -- Recreate dashboard metrics
  INSERT INTO dashboard_metrics (user_id, delayed_applications, process_days, applications_handled)
  VALUES 
    (amitabh_id, 2.75, 3.2, 145),
    (dharmendra_id, 3.1, 2.9, 132),
    (rekha_id, 2.2, 3.5, 158),
    (sridevi_id, 2.8, 3.0, 140);

  -- Create buddy pairs
  INSERT INTO buddy_pairs (officer1_id, officer2_id)
  VALUES 
    (amitabh_id, dharmendra_id),
    (rekha_id, sridevi_id);

  -- Insert historical metrics
  FOR i IN 1..6 LOOP
    -- Amitabh's metrics
    INSERT INTO historical_metrics (user_id, metric_type, value, month)
    VALUES 
      (amitabh_id, 'delayed_applications', 2.75 + (random() * 0.5 - 0.25), date_trunc('month', now() - ((i-1) || ' month')::interval)),
      (amitabh_id, 'process_days', 3.2 + (random() * 0.5 - 0.25), date_trunc('month', now() - ((i-1) || ' month')::interval));

    -- Dharmendra's metrics
    INSERT INTO historical_metrics (user_id, metric_type, value, month)
    VALUES 
      (dharmendra_id, 'delayed_applications', 3.1 + (random() * 0.5 - 0.25), date_trunc('month', now() - ((i-1) || ' month')::interval)),
      (dharmendra_id, 'process_days', 2.9 + (random() * 0.5 - 0.25), date_trunc('month', now() - ((i-1) || ' month')::interval));

    -- Rekha's metrics
    INSERT INTO historical_metrics (user_id, metric_type, value, month)
    VALUES 
      (rekha_id, 'delayed_applications', 2.2 + (random() * 0.5 - 0.25), date_trunc('month', now() - ((i-1) || ' month')::interval)),
      (rekha_id, 'process_days', 3.5 + (random() * 0.5 - 0.25), date_trunc('month', now() - ((i-1) || ' month')::interval));

    -- Sridevi's metrics
    INSERT INTO historical_metrics (user_id, metric_type, value, month)
    VALUES 
      (sridevi_id, 'delayed_applications', 2.8 + (random() * 0.5 - 0.25), date_trunc('month', now() - ((i-1) || ' month')::interval)),
      (sridevi_id, 'process_days', 3.0 + (random() * 0.5 - 0.25), date_trunc('month', now() - ((i-1) || ' month')::interval));
  END LOOP;
END $$;