// Follow this setup guide to integrate the Deno runtime:
// https://deno.com/deploy/docs/supabase-functions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.36.0'
import { corsHeaders } from '../_shared/cors.ts'

interface RequestBody {
  phone: string;
}

Deno.serve(async (req) => {
  // CORS preflight request handling
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain',
        'Access-Control-Max-Age': '86400', // 24 hours
      } 
    })
  }

  try {
    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // WhatsApp API credentials
    const whatsappApiVersion = Deno.env.get('WHATSAPP_API_VERSION') || 'v17.0'
    const whatsappPhoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
    const whatsappAccessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')

    if (!whatsappPhoneNumberId || !whatsappAccessToken) {
      throw new Error('WhatsApp API credentials not configured')
    }

    // Get the phone number from the request
    const { phone } = await req.json() as RequestBody

    if (!phone) {
      throw new Error('Phone number is required')
    }

    // Format the phone number (ensure it has the country code)
    const formattedPhone = formatPhoneNumber(phone)

    // Check if the phone number is associated with an existing officer
    const { data: officer, error: officerError } = await supabase
      .from('profiles')
      .select('id, phone, whatsapp_verified')
      .eq('phone', formattedPhone)
      .single()

    if (officerError && officerError.code !== 'PGRST116') { // Not found is not an error
      throw new Error(`Error fetching officer: ${officerError.message}`)
    }

    // If officer not found or doesn't have this phone, return error
    if (!officer) {
      throw new Error('No account found with this phone number')
    }

    // Send verification template message via WhatsApp API
    const verificationCode = generateVerificationCode()
    
    // Save the verification code in the database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        whatsapp_verification_code: verificationCode,
        whatsapp_verification_sent_at: new Date().toISOString(),
        whatsapp_verified: false
      })
      .eq('id', officer.id)

    if (updateError) {
      throw new Error(`Error updating profile: ${updateError.message}`)
    }

    // Send verification message via WhatsApp API
    const response = await fetch(
      `https://graph.facebook.com/${whatsappApiVersion}/${whatsappPhoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': '*/*',
          'Authorization': `Bearer ${whatsappAccessToken}`
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: formattedPhone,
          type: 'template',
          template: {
            name: 'otp_verification',
            language: {
              code: 'en'
            },
            components: [
              {
                type: 'body',
                parameters: [
                  {
                    type: 'text',
                    text: verificationCode
                  }
                ]
              }
            ]
          }
        })
      }
    )

    const result = await response.json()

    // Store the outgoing message in the database
    await supabase
      .from('whatsapp_messages')
      .insert({
        message_id: result.messages?.[0]?.id || 'unknown',
        phone_number: formattedPhone,
        direction: 'outgoing',
        content: {
          template: 'otp_verification',
          verification_code: verificationCode
        },
        type: 'template',
        created_at: new Date().toISOString()
      })

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Verification code sent',
        data: { phone: formattedPhone }
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Accept': '*/*'
        },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message,
      }),
      {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Accept': '*/*'
        },
        status: 400,
      }
    )
  }
})

// Helper function to format phone numbers consistently
function formatPhoneNumber(phone: string): string {
  // Remove any non-digit characters
  let digits = phone.replace(/\D/g, '')
  
  // Ensure the number starts with a '+'
  if (!phone.includes('+')) {
    // If it starts with a country code like '91', add the +
    return '+' + digits
  }
  
  return phone
}

// Generate a 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
} 