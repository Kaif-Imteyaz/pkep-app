// Follow this setup guide to integrate the Deno runtime:
// https://deno.com/deploy/docs/supabase-functions

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.36.0'
import { corsHeaders } from '../_shared/cors.ts'
import * as crypto from 'https://deno.land/std@0.167.0/node/crypto.ts'

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create a Supabase client with the service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL') as string
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get environment variables
    const verifyToken = Deno.env.get('WEBHOOK_VERIFY_TOKEN')
    const appSecret = Deno.env.get('FACEBOOK_APP_SECRET')

    if (!verifyToken) {
      throw new Error('WEBHOOK_VERIFY_TOKEN is not configured')
    }

    // Handle webhook verification (GET request)
    if (req.method === 'GET') {
      const url = new URL(req.url)
      const mode = url.searchParams.get('hub.mode')
      const token = url.searchParams.get('hub.verify_token')
      const challenge = url.searchParams.get('hub.challenge')

      // Check if a token and mode were sent
      if (mode && token) {
        // Check the mode and token sent are correct
        if (mode === 'subscribe' && token === verifyToken) {
          // Respond with 200 OK and challenge token from the request
          console.log('WEBHOOK_VERIFIED')
          return new Response(challenge, { status: 200 })
        } else {
          // Respond with '403 Forbidden' if verify tokens do not match
          return new Response('Verification token mismatch', { status: 403 })
        }
      }

      return new Response('Invalid verification request', { status: 400 })
    }

    // Handle incoming webhook events (POST request)
    if (req.method === 'POST') {
      // Get the request body as text for signature verification
      const bodyText = await req.text()
      const bodyData = JSON.parse(bodyText)
      
      // Verify the signature if appSecret is provided
      if (appSecret) {
        const signature = req.headers.get('x-hub-signature-256')
        
        if (!signature) {
          console.error('No signature found in headers')
          return new Response('No signature', { status: 401 })
        }
        
        // Calculate expected signature
        const hmac = crypto.createHmac('sha256', appSecret)
        hmac.update(bodyText)
        const expectedSignature = `sha256=${hmac.digest('hex')}`
        
        if (signature !== expectedSignature) {
          console.error('Signature verification failed')
          return new Response('Signature verification failed', { status: 401 })
        }
      }

      // Process the webhook notification
      if (bodyData.object === 'whatsapp_business_account') {
        // Log the incoming webhook
        console.log('Received webhook:', JSON.stringify(bodyData))

        // Process different types of notifications
        for (const entry of bodyData.entry) {
          for (const change of entry.changes) {
            // Handle incoming messages
            if (change.field === 'messages' && change.value.messages) {
              for (const message of change.value.messages) {
                await processIncomingMessage(supabase, change.value, message)
              }
            }
            
            // Handle message status updates
            if (change.field === 'messages' && change.value.statuses) {
              for (const status of change.value.statuses) {
                await processStatusUpdate(supabase, status)
              }
            }
          }
        }

        // Return a '200 OK' response to acknowledge receipt of the event
        return new Response(JSON.stringify({ status: 'success' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        })
      }

      return new Response(JSON.stringify({ status: 'not whatsapp_business_account object' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    // If neither GET nor POST
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    })
  } catch (error) {
    console.error('Error processing webhook:', error)
    
    return new Response(
      JSON.stringify({
        status: 'error',
        message: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

// Process incoming WhatsApp message
async function processIncomingMessage(supabase, value, message) {
  try {
    const phoneNumber = message.from
    const metadata = value.metadata
    const messageId = message.id
    const timestamp = message.timestamp
    const messageType = message.type

    // Store the message in the database
    await supabase.from('whatsapp_messages').insert({
      message_id: messageId,
      phone_number: phoneNumber,
      direction: 'incoming',
      content: message,
      type: messageType,
      created_at: new Date(parseInt(timestamp) * 1000).toISOString()
    })

    // Get the officer by phone number
    const { data: officer, error: officerError } = await supabase
      .from('profiles')
      .select('id, phone, whatsapp_verification_code, whatsapp_verified')
      .eq('phone', phoneNumber)
      .single()

    if (officerError && officerError.code !== 'PGRST116') {
      console.error('Error fetching officer:', officerError)
      return
    }

    // If no officer found with this phone number, stop here
    if (!officer) {
      console.log('No officer found with phone number:', phoneNumber)
      // TODO: Send a message back to inform the user they are not registered
      return
    }

    // Process message based on type
    if (messageType === 'text') {
      await processTextMessage(supabase, officer, phoneNumber, message, metadata)
    } else if (messageType === 'interactive') {
      await processInteractiveMessage(supabase, officer, phoneNumber, message, metadata)
    } else if (messageType === 'button') {
      await processButtonMessage(supabase, officer, phoneNumber, message, metadata)
    }
  } catch (error) {
    console.error('Error processing incoming message:', error)
  }
}

// Process text messages
async function processTextMessage(supabase, officer, phoneNumber, message, metadata) {
  // Extract the message text
  const text = message.text.body.trim()
  
  // Check if this is a verification code (if officer not verified)
  if (!officer.whatsapp_verified && officer.whatsapp_verification_code) {
    if (text === officer.whatsapp_verification_code) {
      // Verify the officer's WhatsApp number
      await supabase
        .from('profiles')
        .update({
          whatsapp_verified: true,
          whatsapp_verification_code: null,
          updated_at: new Date().toISOString()
        })
        .eq('id', officer.id)
        
      // Send verification success message
      await sendTextMessage(phoneNumber, 'Your WhatsApp number has been successfully verified! You can now receive meeting reminders and contribute knowledge through WhatsApp.')
      return
    }
  }
  
  // Check for knowledge contributions using the "#rose:", "#thorn:", "#bud:" format
  if (text.toLowerCase().startsWith('#rose:')) {
    const content = text.substring(6).trim()
    await saveKnowledgeContribution(supabase, officer.id, 'rose', content)
    await sendTextMessage(phoneNumber, 'Thank you for sharing your success! Your "Rose" contribution has been added to the knowledge base.')
    return
  } else if (text.toLowerCase().startsWith('#thorn:')) {
    const content = text.substring(7).trim()
    await saveKnowledgeContribution(supabase, officer.id, 'thorn', content)
    await sendTextMessage(phoneNumber, 'Thank you for sharing your challenge! Your "Thorn" contribution has been added to the knowledge base.')
    return
  } else if (text.toLowerCase().startsWith('#bud:')) {
    const content = text.substring(5).trim()
    await saveKnowledgeContribution(supabase, officer.id, 'bud', content)
    await sendTextMessage(phoneNumber, 'Thank you for sharing your idea! Your "Bud" contribution has been added to the knowledge base.')
    return
  }
  
  // Check for menu command
  if (text.toLowerCase() === 'menu') {
    await sendMainMenu(phoneNumber)
    return
  }
  
  // Check for meetings command
  if (text.toLowerCase() === 'meetings' || text.toLowerCase() === 'meeting') {
    await sendMeetingInformation(supabase, officer.id, phoneNumber)
    return
  }
  
  // Check for performance command
  if (text.toLowerCase() === 'performance' || text.toLowerCase() === 'metrics') {
    await sendPerformanceSnapshot(supabase, officer.id, phoneNumber)
    return
  }
  
  // Default response for unrecognized commands
  await sendTextMessage(
    phoneNumber, 
    "I'm not sure what you're asking for. Here are some things you can do:\n\n" +
    "- Type 'menu' to see the main menu\n" +
    "- Type 'meetings' to view your upcoming meetings\n" +
    "- Type 'performance' to see your performance metrics\n" +
    "- Share knowledge with #rose:, #thorn:, or #bud: followed by your contribution"
  )
}

// Process interactive messages (buttons, lists)
async function processInteractiveMessage(supabase, officer, phoneNumber, message, metadata) {
  const interactive = message.interactive
  
  if (interactive.type === 'button_reply') {
    // Handle button replies
    const buttonId = interactive.button_reply.id
    
    switch (buttonId) {
      case 'KNOWLEDGE_SHARING':
        await sendKnowledgeSharingOptions(phoneNumber)
        break
      case 'MEETINGS':
        await sendMeetingInformation(supabase, officer.id, phoneNumber)
        break
      case 'PERFORMANCE':
        await sendPerformanceSnapshot(supabase, officer.id, phoneNumber)
        break
      case 'CONFIRM_MEETING':
        await handleMeetingConfirmation(supabase, officer.id, phoneNumber)
        break
      case 'RESCHEDULE_MEETING':
        await startReschedulingFlow(supabase, officer.id, phoneNumber)
        break
      default:
        await sendMainMenu(phoneNumber)
    }
  } else if (interactive.type === 'list_reply') {
    // Handle list replies
    const listId = interactive.list_reply.id
    
    // Process list selection based on ID
    // TODO: Implement this based on the list options you provide
  }
}

// Process button messages
async function processButtonMessage(supabase, officer, phoneNumber, message, metadata) {
  // Handle button messages if needed
}

// Process status updates
async function processStatusUpdate(supabase, status) {
  try {
    await supabase
      .from('whatsapp_messages')
      .update({
        status: status.status,
        status_updated_at: new Date(parseInt(status.timestamp) * 1000).toISOString()
      })
      .eq('message_id', status.id)
      
    console.log(`Updated message ${status.id} status to ${status.status}`)
  } catch (error) {
    console.error('Error updating message status:', error)
  }
}

// Save knowledge contribution
async function saveKnowledgeContribution(supabase, officerId, type, content) {
  try {
    await supabase
      .from('notes')
      .insert({
        user_id: officerId,
        type: type,
        content: content,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Error saving knowledge contribution:', error)
    throw error
  }
}

// Send text message
async function sendTextMessage(to, text) {
  try {
    const whatsappApiVersion = Deno.env.get('WHATSAPP_API_VERSION') || 'v17.0'
    const whatsappPhoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
    const whatsappAccessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
    
    if (!whatsappPhoneNumberId || !whatsappAccessToken) {
      throw new Error('WhatsApp API credentials not configured')
    }
    
    const response = await fetch(
      `https://graph.facebook.com/${whatsappApiVersion}/${whatsappPhoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${whatsappAccessToken}`
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'text',
          text: {
            body: text
          }
        })
      }
    )
    
    return await response.json()
  } catch (error) {
    console.error('Error sending text message:', error)
    throw error
  }
}

// Send main menu
async function sendMainMenu(to) {
  try {
    const whatsappApiVersion = Deno.env.get('WHATSAPP_API_VERSION') || 'v17.0'
    const whatsappPhoneNumberId = Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')
    const whatsappAccessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN')
    
    if (!whatsappPhoneNumberId || !whatsappAccessToken) {
      throw new Error('WhatsApp API credentials not configured')
    }
    
    const response = await fetch(
      `https://graph.facebook.com/${whatsappApiVersion}/${whatsappPhoneNumberId}/messages`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${whatsappAccessToken}`
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: to,
          type: 'interactive',
          interactive: {
            type: 'button',
            body: {
              text: 'Welcome to PKEP. What would you like to do today?'
            },
            action: {
              buttons: [
                {
                  type: 'reply',
                  reply: {
                    id: 'KNOWLEDGE_SHARING',
                    title: 'Knowledge Sharing'
                  }
                },
                {
                  type: 'reply',
                  reply: {
                    id: 'MEETINGS',
                    title: 'Meetings'
                  }
                },
                {
                  type: 'reply',
                  reply: {
                    id: 'PERFORMANCE',
                    title: 'Performance'
                  }
                }
              ]
            }
          }
        })
      }
    )
    
    return await response.json()
  } catch (error) {
    console.error('Error sending main menu:', error)
    throw error
  }
}

// Send knowledge sharing options
async function sendKnowledgeSharingOptions(to) {
  try {
    await sendTextMessage(
      to,
      "To share knowledge, use one of these formats:\n\n" +
      "#rose: [Share a success or positive practice]\n" +
      "#thorn: [Share a challenge you faced]\n" +
      "#bud: [Share a new idea or opportunity]\n\n" +
      "For example: #rose: We streamlined the land application process by creating clear checklists for applicants, reducing processing time by 40%."
    )
  } catch (error) {
    console.error('Error sending knowledge sharing options:', error)
    throw error
  }
}

// Send meeting information
async function sendMeetingInformation(supabase, officerId, to) {
  try {
    // Get the officer's upcoming meeting
    const { data: meeting, error } = await supabase
      .from('meetings')
      .select(`
        *,
        partner:profiles!meetings_partner_id_fkey(full_name)
      `)
      .eq('officer_id', officerId)
      .gt('meeting_date', new Date().toISOString())
      .order('meeting_date', { ascending: true })
      .limit(1)
      .single()
    
    if (error) {
      console.error('Error fetching meeting:', error)
      await sendTextMessage(to, "Sorry, I couldn't retrieve your meeting information. Please try again later.")
      return
    }
    
    if (!meeting) {
      await sendTextMessage(to, "You don't have any upcoming meetings scheduled.")
      return
    }
    
    // Format the meeting date
    const meetingDate = new Date(meeting.meeting_date)
    const formattedDate = meetingDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
    const formattedTime = meetingDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    
    // Send meeting information
    const message = 
      `Your upcoming PKEP meeting:\n\n` +
      `Date: ${formattedDate}\n` +
      `Time: ${formattedTime}\n` +
      `Partner: ${meeting.partner.full_name}\n` +
      `Status: ${meeting.status.charAt(0).toUpperCase() + meeting.status.slice(1)}\n\n` +
      `Link: ${meeting.meeting_link || 'Not available yet'}`
    
    await sendTextMessage(to, message)
    
    // If the meeting is still pending confirmation, send confirmation options
    if (meeting.status === 'scheduled') {
      const response = await fetch(
        `https://graph.facebook.com/${Deno.env.get('WHATSAPP_API_VERSION') || 'v17.0'}/${Deno.env.get('WHATSAPP_PHONE_NUMBER_ID')}/messages`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('WHATSAPP_ACCESS_TOKEN')}`
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual',
            to: to,
            type: 'interactive',
            interactive: {
              type: 'button',
              body: {
                text: 'Would you like to confirm or reschedule this meeting?'
              },
              action: {
                buttons: [
                  {
                    type: 'reply',
                    reply: {
                      id: 'CONFIRM_MEETING',
                      title: 'Confirm'
                    }
                  },
                  {
                    type: 'reply',
                    reply: {
                      id: 'RESCHEDULE_MEETING',
                      title: 'Reschedule'
                    }
                  }
                ]
              }
            }
          })
        }
      )
    }
  } catch (error) {
    console.error('Error sending meeting information:', error)
    await sendTextMessage(to, "Sorry, I couldn't retrieve your meeting information. Please try again later.")
  }
}

// Send performance snapshot
async function sendPerformanceSnapshot(supabase, officerId, to) {
  try {
    // Get the officer's performance metrics
    const { data: metrics, error } = await supabase
      .from('performance_metrics')
      .select('*')
      .eq('officer_id', officerId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()
    
    if (error) {
      console.error('Error fetching performance metrics:', error)
      await sendTextMessage(to, "Sorry, I couldn't retrieve your performance metrics. Please try again later.")
      return
    }
    
    if (!metrics) {
      await sendTextMessage(to, "No performance metrics are available for you at this time.")
      return
    }
    
    // Format the performance snapshot
    const message = 
      `Performance Snapshot (${metrics.metric_period}):\n\n` +
      `Process Days: ${metrics.process_days} days\n` +
      `Delayed Applications: ${metrics.delayed_applications}\n` +
      `Handled Applications: ${metrics.handled_applications}\n` +
      `Percentile Rank: ${Math.round(metrics.comparative_rank * 100)}%\n\n` +
      `For more details, visit the PKEP dashboard.`
    
    await sendTextMessage(to, message)
  } catch (error) {
    console.error('Error sending performance snapshot:', error)
    await sendTextMessage(to, "Sorry, I couldn't retrieve your performance metrics. Please try again later.")
  }
}

// Handle meeting confirmation
async function handleMeetingConfirmation(supabase, officerId, to) {
  try {
    // Update the meeting status to confirmed
    const { data, error } = await supabase
      .from('meetings')
      .update({
        status: 'confirmed',
        updated_at: new Date().toISOString()
      })
      .eq('officer_id', officerId)
      .gt('meeting_date', new Date().toISOString())
      .order('meeting_date', { ascending: true })
      .limit(1)
    
    if (error) {
      console.error('Error confirming meeting:', error)
      await sendTextMessage(to, "Sorry, I couldn't confirm your meeting. Please try again later.")
      return
    }
    
    await sendTextMessage(to, "Great! Your meeting has been confirmed. You'll receive a reminder 24 hours before the scheduled time.")
  } catch (error) {
    console.error('Error handling meeting confirmation:', error)
    await sendTextMessage(to, "Sorry, there was an error confirming your meeting. Please try again later.")
  }
}

// Start rescheduling flow
async function startReschedulingFlow(supabase, officerId, to) {
  try {
    // For now, just provide instructions on how to reschedule
    await sendTextMessage(
      to,
      "To reschedule your meeting, please visit the PKEP web platform at https://pkep-platform.example.com and use the meeting scheduler on your dashboard.\n\n" +
      "Both you and your partner will need to confirm the new time."
    )
    
    // TODO: Implement a more interactive rescheduling flow in the future
  } catch (error) {
    console.error('Error starting rescheduling flow:', error)
    await sendTextMessage(to, "Sorry, there was an error starting the rescheduling process. Please try again later.")
  }
} 