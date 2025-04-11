/*
  # Add WhatsApp integration to PKEP
  
  1. Changes:
    - Add phone field to user profiles
    - Create whatsapp_messages table
    - Create necessary indexes
    - Configure security policies
*/

-- First, ensure we have the necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Add a phone column to auth.users if it doesn't exist
DO $$ 
BEGIN
  ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS phone TEXT UNIQUE;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

-- Create the whatsapp_messages table
CREATE TABLE IF NOT EXISTS whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_id TEXT UNIQUE,
  user_id uuid REFERENCES auth.users,
  phone_number TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('incoming', 'outgoing')),
  content JSONB NOT NULL,
  type TEXT NOT NULL,
  status TEXT,
  status_updated_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- Create indexes for the whatsapp_messages table
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone_number ON whatsapp_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_id ON whatsapp_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_direction ON whatsapp_messages(direction);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_created_at ON whatsapp_messages(created_at);

-- Create a sessions table to track WhatsApp conversation sessions
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users,
  phone_number TEXT NOT NULL,
  session_data JSONB DEFAULT '{}'::jsonb,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone_number ON whatsapp_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_expires_at ON whatsapp_sessions(expires_at);

-- Enable RLS on the new tables
ALTER TABLE whatsapp_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for whatsapp_messages
CREATE POLICY "Users can view their own messages" 
  ON whatsapp_messages
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all whatsapp messages" 
  ON whatsapp_messages
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create policies for whatsapp_sessions
CREATE POLICY "Users can view their own sessions" 
  ON whatsapp_sessions
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage all whatsapp sessions" 
  ON whatsapp_sessions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for whatsapp_sessions
CREATE TRIGGER update_whatsapp_sessions_updated_at
BEFORE UPDATE ON whatsapp_sessions
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Add meetings table if it doesn't exist
CREATE TABLE IF NOT EXISTS meetings (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  officer_id uuid REFERENCES auth.users NOT NULL,
  partner_id uuid REFERENCES auth.users NOT NULL,
  meeting_date timestamptz NOT NULL,
  meeting_link TEXT,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled')),
  notes TEXT,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for meetings
CREATE INDEX IF NOT EXISTS idx_meetings_officer_id ON meetings(officer_id);
CREATE INDEX IF NOT EXISTS idx_meetings_partner_id ON meetings(partner_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(meeting_date);

-- Enable RLS on meetings
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;

-- Create policies for meetings
CREATE POLICY "Users can view their own meetings"
  ON meetings
  FOR SELECT
  USING (officer_id = auth.uid() OR partner_id = auth.uid());

CREATE POLICY "Users can update their own meetings"
  ON meetings
  FOR UPDATE
  USING (officer_id = auth.uid());

CREATE POLICY "Service role can manage all meetings"
  ON meetings
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create trigger for meetings
CREATE TRIGGER update_meetings_updated_at
BEFORE UPDATE ON meetings
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column(); 