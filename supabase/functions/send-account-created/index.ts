// @deno-types="https://esm.sh/v128/supabase@1.8.1/dist/main/index.d.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.24.0'

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Request body interface
interface RequestBody {
  phone: string
  officerName: string
  officerId: string
}

// Function to format phone number
function formatPhoneNumber(phone: string): string {
  // Strip any non-numeric characters
  const cleaned = phone.replace(/\D/g, '')
  
  // If the number starts with 0, replace it with the country code
  if (cleaned.startsWith('0')) {
    return `254${cleaned.substring(1)}`
  }
  
  // If it's missing the country code, add it
  if (!cleaned.startsWith('254')) {
    return `254${cleaned}`
  }
  
  return cleaned
}

// Main server function
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }
  
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ 
      status: 'error', 
      message: 'Method not allowed' 
    }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405
    })
  }
  
  try {
    // Get WhatsApp API credentials from environment
    const WHATSAPP_API_KEY = Deno.env.get('WHATSAPP_API_KEY')
    const WHATSAPP_API_URL = Deno.env.get('WHATSAPP_API_URL')
    const WHATSAPP_PHONE_ID = Deno.env.get('WHATSAPP_PHONE_ID')
    
    if (!WHATSAPP_API_KEY || !WHATSAPP_API_URL || !WHATSAPP_PHONE_ID) {
      throw new Error('WhatsApp API credentials not configured')
    }
    
    // Get Supabase credentials
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured')
    }
    
    // Create Supabase admin client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
    
    // Parse request body
    const requestData: RequestBody = await req.json()
    
    // Extract and validate required fields
    const { phone, officerName, officerId } = requestData
    
    if (!phone) {
      throw new Error('Phone number is required')
    }
    
    if (!officerName) {
      throw new Error('Officer name is required')
    }
    
    if (!officerId) {
      throw new Error('Officer ID is required')
    }
    
    // Format phone number to ensure it has country code
    const formattedPhone = formatPhoneNumber(phone)
    
    // Prepare the WhatsApp API request
    const whatsappRequest = {
      messaging_product: 'whatsapp',
      to: formattedPhone,
      type: 'template',
      template: {
        name: 'officer_registration',
        language: {
          code: 'en_US'
        },
        components: [
          {
            type: 'body',
            parameters: [
              {
                type: 'text',
                text: officerName
              }
            ]
          }
        ]
      }
    }
    
    // Send the message via WhatsApp API
    const response = await fetch(`${WHATSAPP_API_URL}/${WHATSAPP_PHONE_ID}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHATSAPP_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(whatsappRequest)
    })
    
    if (!response.ok) {
      const errorDetails = await response.text()
      throw new Error(`WhatsApp API error: ${response.status} - ${errorDetails}`)
    }
    
    const responseData = await response.json()
    
    // Store the outgoing message in the database
    const { error: dbError } = await supabase
      .from('whatsapp_messages')
      .insert({
        user_id: officerId,
        phone: formattedPhone,
        direction: 'outgoing',
        content: JSON.stringify(whatsappRequest),
        type: 'template',
        status: 'sent'
      })
    
    if (dbError) {
      console.error('Error storing message in database:', dbError)
    }
    
    return new Response(
      JSON.stringify({ 
        status: 'success', 
        message: 'Registration confirmation sent',
        data: responseData
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
    
  } catch (error) {
    console.error('Error processing request:', error)
    
    return new Response(
      JSON.stringify({ 
        status: 'error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
}) 