-- Create profiles table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  phone TEXT,
  whatsapp_opted_in BOOLEAN DEFAULT FALSE,
  whatsapp_verified BOOLEAN DEFAULT FALSE,
  whatsapp_verification_code TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create whatsapp_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  message_id TEXT,
  phone_number TEXT,
  direction TEXT CHECK (direction IN ('incoming', 'outgoing')),
  content JSONB,
  type TEXT,
  status TEXT,
  status_updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create note_type enum if it doesn't exist
DO $$ 
BEGIN
  CREATE TYPE note_type AS ENUM ('rose', 'thorn', 'bud');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Create notes table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  type note_type NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create meetings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  partner_id UUID REFERENCES auth.users(id) NOT NULL,
  meeting_date TIMESTAMP WITH TIME ZONE NOT NULL,
  meeting_link TEXT,
  status TEXT NOT NULL CHECK (status IN ('scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create dashboard_metrics table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.dashboard_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  delayed_applications NUMERIC NOT NULL,
  process_days NUMERIC NOT NULL,
  applications_handled INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create historical_metrics table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.historical_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  metric_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  month DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create buddy_pairs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.buddy_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  partner_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create whatsapp_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.whatsapp_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  phone_number TEXT NOT NULL,
  session_data JSONB DEFAULT '{}'::jsonb,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create indexes for performance optimization
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_phone_number ON whatsapp_messages(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_messages_user_id ON whatsapp_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_user_id ON meetings(user_id);
CREATE INDEX IF NOT EXISTS idx_meetings_partner_id ON meetings(partner_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_phone_number ON whatsapp_sessions(phone_number);
CREATE INDEX IF NOT EXISTS idx_whatsapp_sessions_expires_at ON whatsapp_sessions(expires_at);

-- Create RLS Policies for profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Create RLS Policies for whatsapp_messages table
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own messages"
  ON public.whatsapp_messages FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage whatsapp messages"
  ON public.whatsapp_messages
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create RLS Policies for notes table
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read notes"
  ON public.notes FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own notes"
  ON public.notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notes"
  ON public.notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notes"
  ON public.notes FOR DELETE
  USING (auth.uid() = user_id);

-- Create RLS Policies for meetings table
ALTER TABLE public.meetings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own meetings"
  ON public.meetings FOR SELECT
  USING (user_id = auth.uid() OR partner_id = auth.uid());

CREATE POLICY "Users can update their own meetings"
  ON public.meetings FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage meetings"
  ON public.meetings
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create RLS Policies for dashboard_metrics table
ALTER TABLE public.dashboard_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own metrics"
  ON public.dashboard_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage metrics"
  ON public.dashboard_metrics
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create RLS Policies for historical_metrics table
ALTER TABLE public.historical_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own historical metrics"
  ON public.historical_metrics FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage historical metrics"
  ON public.historical_metrics
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create RLS Policies for buddy_pairs table
ALTER TABLE public.buddy_pairs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read their buddy pairs"
  ON public.buddy_pairs FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = partner_id);

CREATE POLICY "Service role can manage buddy pairs"
  ON public.buddy_pairs
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create RLS Policies for whatsapp_sessions table
ALTER TABLE public.whatsapp_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
  ON public.whatsapp_sessions FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Service role can manage sessions"
  ON public.whatsapp_sessions
  FOR ALL
  USING (auth.role() = 'service_role');

-- Create timestamp update trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for meetings
CREATE TRIGGER update_meetings_updated_at
BEFORE UPDATE ON meetings
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Create trigger for whatsapp_sessions
CREATE TRIGGER update_whatsapp_sessions_updated_at
BEFORE UPDATE ON whatsapp_sessions
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();

-- Create a function to handle new user registration and link auth users to public profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically create a profile for new users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create a stored procedure to create profiles table if not exists
CREATE OR REPLACE FUNCTION create_profiles_table_if_not_exists()
RETURNS void AS $$
BEGIN
  -- Check if the profiles table exists
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'profiles'
  ) THEN
    -- Create the profiles table
    EXECUTE '
      CREATE TABLE public.profiles (
        id UUID PRIMARY KEY REFERENCES auth.users(id),
        email TEXT NOT NULL,
        full_name TEXT,
        phone TEXT,
        whatsapp_opted_in BOOLEAN DEFAULT FALSE,
        whatsapp_verified BOOLEAN DEFAULT FALSE,
        whatsapp_verification_code TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
      
      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "Users can view their own profile"
        ON public.profiles FOR SELECT
        USING (auth.uid() = id);
      
      CREATE POLICY "Users can update their own profile"
        ON public.profiles FOR UPDATE
        USING (auth.uid() = id);
    ';
  END IF;
  
  -- Check if the whatsapp_messages table exists
  IF NOT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'whatsapp_messages'
  ) THEN
    -- Create the whatsapp_messages table
    EXECUTE '
      CREATE TABLE public.whatsapp_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES auth.users(id),
        message_id TEXT,
        phone_number TEXT,
        direction TEXT CHECK (direction IN (''incoming'', ''outgoing'')),
        content JSONB,
        type TEXT,
        status TEXT,
        status_updated_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
      );
      
      ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;
      
      CREATE POLICY "Users can view their own messages"
        ON public.whatsapp_messages FOR SELECT
        USING (auth.uid() = user_id);
    ';
  END IF;
END;
$$ LANGUAGE plpgsql; 