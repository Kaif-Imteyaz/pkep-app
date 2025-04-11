import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with environment variables
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Create a Supabase client with the service role key for server-side operations
export const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Get officer information by phone number
 * 
 * @param {string} phone - Officer's phone number
 * @returns {Promise<object|null>} Officer data or null if not found
 */
export async function getOfficerByPhone(phone) {
  try {
    // Format phone number to ensure consistent matching
    const formattedPhone = formatPhoneNumber(phone);
    
    // First try to find user in auth.users table
    const { data: userData, error: userError } = await supabase
      .from('auth.users')
      .select('id, phone, email')
      .eq('phone', formattedPhone)
      .single();
    
    if (!userError && userData) {
      console.log(`Found user in auth.users: ${userData.id}`);
      return userData;
    }
    
    // If not found in auth.users, try officers table
    const { data: officerData, error: officerError } = await supabase
      .from('officers')
      .select('id, phone, email, name, district, department, designation')
      .eq('phone', formattedPhone)
      .single();
    
    if (officerError) {
      if (officerError.code === 'PGRST116') {
        console.log(`No officer found with phone number ${formattedPhone}`);
        return null;
      }
      
      console.error('Error getting officer by phone:', officerError);
      throw officerError;
    }
    
    return officerData;
  } catch (error) {
    console.error('Error in getOfficerByPhone:', error);
    return null;
  }
}

/**
 * Save a knowledge contribution (note)
 * 
 * @param {string} userId - User ID
 * @param {string} type - Contribution type (rose, thorn, bud)
 * @param {string} content - Contribution content
 * @returns {Promise<object|null>} Saved contribution data
 */
export async function saveContribution(userId, type, content) {
  try {
    const { data, error } = await supabase
      .from('notes')
      .insert([
        { 
          user_id: userId,
          type: type,
          content: content,
          created_at: new Date().toISOString()
        }
      ])
      .select();
    
    if (error) {
      console.error('Error saving contribution:', error);
      throw error;
    }
    
    console.log('Contribution saved successfully');
    return data[0];
  } catch (error) {
    console.error('Error in saveContribution:', error);
    return null;
  }
}

/**
 * Store WhatsApp message in database
 * 
 * @param {string} messageId - WhatsApp message ID
 * @param {string} userId - User ID (optional for incoming messages)
 * @param {string} phoneNumber - Phone number
 * @param {object|string} content - Message content
 * @param {string} type - Message type (text, interactive, etc.)
 * @param {string} direction - Message direction (incoming, outgoing)
 * @param {string} status - Message status (sent, delivered, read, etc.)
 * @returns {Promise<object|null>} Stored message data
 */
export async function storeMessage(messageId, userId, phoneNumber, content, type, direction = 'incoming', status = 'received') {
  try {
    // Convert content to JSON if it's not already
    const jsonContent = typeof content === 'string' ? { body: content } : content;
    
    // Build the record object
    const messageRecord = { 
      message_id: messageId,
      phone_number: phoneNumber,
      content: jsonContent,
      type: type,
      direction: direction,
      status: status,
      created_at: new Date().toISOString()
    };
    
    // Add user_id if provided
    if (userId) {
      messageRecord.user_id = userId;
    }
    
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .insert([messageRecord])
      .select();
    
    if (error) {
      console.error('Error storing message:', error);
      throw error;
    }
    
    return data[0];
  } catch (error) {
    console.error('Error in storeMessage:', error);
    // Don't throw error to prevent webhook processing failure
    return null;
  }
}

/**
 * Get or create WhatsApp session
 * 
 * @param {string} userId - User ID
 * @param {string} phoneNumber - Phone number
 * @returns {Promise<object|null>} Session data
 */
export async function getOrCreateSession(userId, phoneNumber) {
  try {
    // Check for existing session
    const { data: existingSession, error: sessionError } = await supabase
      .from('whatsapp_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('phone_number', phoneNumber)
      .single();
    
    if (!sessionError && existingSession) {
      // Check if session is still valid
      const now = new Date();
      const expiresAt = new Date(existingSession.expires_at);
      
      if (now < expiresAt) {
        // Update expiration time
        const newExpiresAt = new Date();
        newExpiresAt.setHours(newExpiresAt.getHours() + 24);
        
        const { data: updatedSession, error: updateError } = await supabase
          .from('whatsapp_sessions')
          .update({ 
            expires_at: newExpiresAt.toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSession.id)
          .select()
          .single();
        
        if (updateError) {
          console.error('Error updating session:', updateError);
          return existingSession;
        }
        
        return updatedSession;
      }
    }
    
    // Create new session
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    const { data: newSession, error: createError } = await supabase
      .from('whatsapp_sessions')
      .insert([
        {
          user_id: userId,
          phone_number: phoneNumber,
          session_data: { state: 'main_menu' },
          expires_at: expiresAt.toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
      .select()
      .single();
    
    if (createError) {
      console.error('Error creating session:', createError);
      throw createError;
    }
    
    return newSession;
  } catch (error) {
    console.error('Error in getOrCreateSession:', error);
    return null;
  }
}

/**
 * Update message status
 * 
 * @param {string} messageId - WhatsApp message ID
 * @param {string} status - New status (sent, delivered, read, failed)
 * @returns {Promise<object|null>} Updated message data
 */
export async function updateMessageStatus(messageId, status) {
  try {
    const { data, error } = await supabase
      .from('whatsapp_messages')
      .update({ 
        status: status,
        status_updated_at: new Date().toISOString()
      })
      .eq('message_id', messageId)
      .select();
    
    if (error) {
      console.error('Error updating message status:', error);
      throw error;
    }
    
    return data[0];
  } catch (error) {
    console.error('Error in updateMessageStatus:', error);
    return null;
  }
}

/**
 * Get upcoming meetings for an officer
 * 
 * @param {string} officerId - Officer ID
 * @returns {Promise<Array|null>} Array of upcoming meetings
 */
export async function getUpcomingMeetings(officerId) {
  try {
    const { data, error } = await supabase
      .from('meetings')
      .select(`
        *,
        partner:officers!meetings_partner_id_fkey(id, name, phone, district)
      `)
      .eq('officer_id', officerId)
      .gt('meeting_date', new Date().toISOString())
      .order('meeting_date', { ascending: true })
      .limit(5);
    
    if (error) {
      console.error('Error getting upcoming meetings:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Error in getUpcomingMeetings:', error);
    return null;
  }
}

/**
 * Update meeting status
 * 
 * @param {string} meetingId - Meeting ID
 * @param {string} status - New status (confirmed, rescheduled, cancelled)
 * @returns {Promise<object|null>} Updated meeting data
 */
export async function updateMeetingStatus(meetingId, status) {
  try {
    const { data, error } = await supabase
      .from('meetings')
      .update({ 
        status: status,
        updated_at: new Date().toISOString()
      })
      .eq('id', meetingId)
      .select();
    
    if (error) {
      console.error('Error updating meeting status:', error);
      throw error;
    }
    
    return data[0];
  } catch (error) {
    console.error('Error in updateMeetingStatus:', error);
    return null;
  }
}

/**
 * Get performance metrics for an officer
 * 
 * @param {string} officerId - Officer ID
 * @param {string} [period] - Optional metric period (e.g., "2023-Q1")
 * @returns {Promise<Array|null>} Performance metrics data
 */
export async function getPerformanceMetrics(officerId, period = null) {
  try {
    let query = supabase
      .from('performance_metrics')
      .select('*')
      .eq('officer_id', officerId);
    
    if (period) {
      query = query.eq('metric_period', period);
    }
    
    const { data, error } = await query
      .order('metric_period', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('Error getting performance metrics:', error);
      throw error;
    }
    
    return data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('Error in getPerformanceMetrics:', error);
    return null;
  }
}

/**
 * Format phone number to ensure consistent matching
 * Removes spaces, dashes, etc. and ensures country code is present
 * 
 * @param {string} phone - Phone number to format
 * @returns {string} Formatted phone number
 */
export function formatPhoneNumber(phone) {
  // Remove non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Ensure country code is present (assuming India +91 if not)
  if (digits.length === 10) {
    return `91${digits}`;  // Add India country code
  } else if (digits.startsWith('91') && digits.length === 12) {
    return digits;  // Already has India country code
  } else if (digits.startsWith('0')) {
    return `91${digits.substring(1)}`; // Replace leading 0 with country code
  } else if (digits.startsWith('+')) {
    return digits.substring(1); // Remove leading +
  }
  
  // Return as is if none of the above apply
  return digits;
} 