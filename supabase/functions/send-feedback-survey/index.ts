// @deno-types="https://esm.sh/v128/supabase@1.8.1/dist/main/index.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.24.0'

// CORS headers with both localhost and production URLs
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Allow all origins for testing; in production you might want to restrict this
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-auth',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Max-Age': '86400', // 24 hours cache for preflight requests
}

// Request body interface
interface RequestBody {
  phone: string;
  businessName?: string;
  location?: string;
  visitDate?: string;
  surveyLink?: string;
  userId?: string;
}

// Function to format phone number
function formatPhoneNumber(phone: string): string {
  // Strip any non-numeric characters except for + at the beginning
  if (phone.startsWith('+')) {
    // Keep the + and strip other non-numeric characters
    return '+' + phone.substring(1).replace(/\D/g, '');
  }
  
  // Strip any non-numeric characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If the number doesn't have a country code, assume it's from the country
  // specified in the test phone (which appears to be India)
  if (!cleaned.startsWith('91') && !cleaned.startsWith('1')) {
    return '+91' + cleaned;
  }
  
  // Otherwise, add a + at the beginning
  return '+' + cleaned;
}

// Main server function
Deno.serve(async (req) => {
  console.log(`Received ${req.method} request to ${req.url}`);
  
  // Handle CORS preflight requests - this is critical for browser compatibility
  if (req.method === 'OPTIONS') {
    console.log('Handling OPTIONS request (CORS preflight)');
    return new Response('ok', { 
      headers: corsHeaders,
      status: 200
    });
  }
  
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ 
      status: 'error', 
      message: 'Method not allowed' 
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405
    });
  }
  
  try {
    // Get WhatsApp API credentials from environment
    const WHATSAPP_TOKEN = Deno.env.get('WHATSAPP_TOKEN');
    const WHATSAPP_API_VERSION = Deno.env.get('WHATSAPP_API_VERSION') || 'v18.0';
    const WHATSAPP_PHONE_NUMBER_ID = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID');
    
    if (!WHATSAPP_TOKEN || !WHATSAPP_PHONE_NUMBER_ID) {
      throw new Error('WhatsApp API credentials not configured');
    }
    
    // Get Supabase credentials
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }
    
    // Create Supabase admin client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Parse request body
    const requestData: RequestBody = await req.json();
    
    // Extract and validate required fields
    const { phone, businessName, location, visitDate, surveyLink, userId } = requestData;
    
    if (!phone) {
      throw new Error('Phone number is required');
    }
    
    // Format phone number to ensure it has country code
    const formattedPhone = formatPhoneNumber(phone);
    
    console.log('Sending message to:', formattedPhone);
    
    // Default values based on the template shown in the image
    const businessNameValue = businessName || "Jasper's Market";
    
    // Prepare the WhatsApp API request for feedback template
    const whatsappRequest = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: formattedPhone,
      type: 'template',
      template: {
        name: 'feedback_survey',
        language: {
          code: 'en_US'
        },
        components: [
          {
            type: 'header',
            parameters: [
              {
                type: 'text',
                text: 'How did we do?'
              }
            ]
          },
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: businessNameValue
              },
              {
                type: 'text',
                text: 'customer feedback'
              },
              {
                type: 'text',
                text: 'continually improve our products'
              }
            ]
          },
          {
            type: 'button',
            sub_type: 'url',
            index: 0,
            parameters: [
              {
                type: 'text',
                text: surveyLink || 'https://example.com/feedback'
              }
            ]
          }
        ]
      }
    };
    
    console.log('Sending WhatsApp request:', JSON.stringify(whatsappRequest, null, 2));
    
    // Send the message via WhatsApp API
    const response = await fetch(`https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(whatsappRequest)
    });
    
    // Get the response as text first to handle empty responses
    const responseText = await response.text();
    let responseData;
    
    try {
      responseData = responseText ? JSON.parse(responseText) : {};
    } catch (e) {
      console.error('Error parsing response:', e);
      responseData = { error: 'Invalid JSON response' };
    }
    
    if (!response.ok) {
      console.error('WhatsApp API error:', responseData);
      throw new Error(`WhatsApp API error: ${response.status} - ${JSON.stringify(responseData)}`);
    }
    
    console.log('WhatsApp API response:', JSON.stringify(responseData, null, 2));
    
    // Store the outgoing message in the database if userId provided
    if (userId) {
      try {
        const { error: dbError } = await supabase
          .from('whatsapp_messages')
          .insert({
            user_id: userId,
            phone_number: formattedPhone,
            direction: 'outgoing',
            content: { template: 'feedback_survey' },
            type: 'template',
            status: 'sent',
            created_at: new Date().toISOString()
          });
        
        if (dbError) {
          console.error('Error storing message in database:', dbError);
        }
      } catch (dbErr) {
        // Don't fail the entire request if DB storage fails
        console.error('DB error (non-critical):', dbErr);
      }
    }
    
    return new Response(
      JSON.stringify({ 
        status: 'success', 
        message: 'Feedback survey sent',
        data: responseData
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );
    
  } catch (error) {
    console.error('Error processing request:', error);
    
    return new Response(
      JSON.stringify({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
}); 