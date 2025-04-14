import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verify that the environment variables are available
if (!supabaseUrl || !supabaseKey) {
  console.error('Supabase URL or API key is missing');
}

// Create Supabase client with proper configuration
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
  },
  // Override fetch to fix Accept header issues for REST API calls
  db: {
    schema: 'public',
  }
});

// Custom error handler for debugging auth issues
if (import.meta.env.DEV) {
  // Monitor auth state changes for debugging
  supabase.auth.onAuthStateChange((event, session) => {
    console.log(`Auth state changed: ${event}`, session ? 'Session exists' : 'No session');
    
    // When a session is created, initialize profile if needed
    if (event === 'SIGNED_IN' && session) {
      initializeUserProfile(session.user.id);
    }
  });
  
  // Add global fetch error handler
  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {
    const url = typeof input === 'string' 
      ? input 
      : input instanceof Request 
        ? input.url 
        : input.toString();
    
    // Fix headers for Supabase REST API requests
    if (url.includes(supabaseUrl) && url.includes('/rest/v1/')) {
      init = init || {};
      init.headers = {
        ...init.headers,
        'Accept': 'application/json',
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      };
    }
    
    // Only intercept Supabase requests
    if (url.includes(supabaseUrl)) {
      try {
        const response = await originalFetch(input, init);
        
        if (response.status === 403 && url.includes('/auth/v1/user')) {
          console.error('403 Forbidden Error for Supabase Auth request:');
          console.debug('URL:', url);
          console.debug('Headers:', init?.headers);
          
          // Check if token exists
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            console.warn('No active session found. User might need to login.');
          } else {
            console.debug('Session exists but request failed with 403. Possible permission issue or token expired.');
          }
        } else if (response.status === 406) {
          console.error('406 Not Acceptable Error for Supabase request:');
          console.debug('URL:', url);
          console.debug('Headers:', init?.headers);
        }
        
        return response;
      } catch (error) {
        console.error('Fetch error for Supabase request:', error);
        throw error;
      }
    }
    
    return originalFetch(input, init);
  };
}

// Helper function to initialize user profile
async function initializeUserProfile(userId: string): Promise<void> {
  // Check if profile exists
  const { data, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', userId);
    
  if (error) {
    console.error('Error checking profile existence:', error);
    return;
  }
  
  // If profile doesn't exist, create one
  if (!data || data.length === 0) {
    try {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData?.user;
      
      if (user) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email,
            full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            phone: null,
            whatsapp_opted_in: false,
            whatsapp_verified: false,
            created_at: new Date(),
            updated_at: new Date()
          });
          
        if (insertError) {
          console.error('Error creating profile:', insertError);
        } else {
          console.log('Created profile for user:', user.id);
        }
      }
    } catch (err) {
      console.error('Error in profile initialization:', err);
    }
  }
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function getOfficerByPhone(phone: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('officers')
      .select('*')
      .eq('phone', phone)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting officer:', error);
    return null;
  }
}

export async function saveContribution(userId: string, type: string, content: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('contributions')
      .insert({
        user_id: userId,
        type,
        content,
        created_at: new Date().toISOString()
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving contribution:', error);
    return false;
  }
}

export async function storeMessage(messageId: string, userId: string, from: string, content: string, type: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('whatsapp_messages')
      .insert({
        id: messageId,
        user_id: userId,
        from,
        content,
        type,
        created_at: new Date().toISOString()
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error storing message:', error);
    return false;
  }
}

export async function updateMessageStatus(messageId: string, status: string) {
  try {
    const { data, error } = await supabaseAdmin
      .from('whatsapp_messages')
      .update({ status })
      .eq('id', messageId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error updating message status:', error);
    return false;
  }
}

export async function getOrCreateSession(userId: string, phone: string) {
  try {
    // Try to get existing session
    let { data: session, error } = await supabaseAdmin
      .from('whatsapp_sessions')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      // If no session exists, create a new one
      const { data: newSession, error: createError } = await supabaseAdmin
        .from('whatsapp_sessions')
        .insert({
          user_id: userId,
          phone_number: phone,
          session_data: { state: 'main_menu' },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (createError) throw createError;
      return newSession;
    }

    return session;
  } catch (error) {
    console.error('Error getting/creating session:', error);
    return null;
  }
}