/*
  # Add historical metrics table

  1. New Tables
    - `historical_metrics`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `metric_type` (text)
      - `value` (numeric)
      - `month` (date)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS
    - Add policy for users to read their own data
*/

CREATE TABLE historical_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  metric_type text NOT NULL,
  value numeric NOT NULL,
  month date NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE historical_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own historical metrics"
  ON historical_metrics
  FOR SELECT
  USING (auth.uid() = user_id);

-- Insert dummy historical data
DO $$
DECLARE
  test_user_id uuid;
  i integer;
  curr_date date;
BEGIN
  SELECT id INTO test_user_id FROM auth.users WHERE email = 'test@punjab.gov.in' LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    FOR i IN 1..6 LOOP
      curr_date := date_trunc('month', now() - ((i-1) || ' month')::interval);
      
      -- Insert delayed applications history
      INSERT INTO historical_metrics (user_id, metric_type, value, month)
      VALUES (
        test_user_id,
        'delayed_applications',
        2.75 + (random() * 0.5 - 0.25),
        curr_date
      );
      
      -- Insert process days history
      INSERT INTO historical_metrics (user_id, metric_type, value, month)
      VALUES (
        test_user_id,
        'process_days',
        3.2 + (random() * 0.5 - 0.25),
        curr_date
      );
    END LOOP;
  END IF;
END $$;