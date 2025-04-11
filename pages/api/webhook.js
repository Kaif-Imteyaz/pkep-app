import crypto from 'crypto';
import * as whatsapp from '../../lib/whatsapp';
import { supabase, getOfficerByPhone, saveContribution, storeMessage, updateMessageStatus, getOrCreateSession } from '../../lib/supabase';
import { recordWebhookReceived } from './health';
import { trackWebhookRequest, logEvent } from '../../utils/monitoring';

// Webhook verification token
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;
// Facebook App Secret for webhook signature verification
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET;

// Verify webhook signature from WhatsApp
function verifyWebhookSignature(req) {
  if (!FACEBOOK_APP_SECRET) {
    console.warn('FACEBOOK_APP_SECRET not configured. Skipping signature verification.');
    return true;
  }

  const signature = req.headers['x-hub-signature-256'] || '';
  const body = req.body;

  if (!signature) {
    console.error('No signature found in headers');
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', FACEBOOK_APP_SECRET)
    .update(JSON.stringify(body))
    .digest('hex');

  return signature === `sha256=${expectedSignature}`;
}

// Handle incoming text message
async function handleTextMessage(from, userId, messageId, text) {
  // Store the message in the database
  await storeMessage(messageId, userId, from, text, 'text');

  // Get or create the user's session
  const session = await getOrCreateSession(userId, from);
  
  if (!session) {
    console.error('Failed to get or create session');
    return whatsapp.sendTextMessage(from, userId, "We're experiencing technical difficulties. Please try again later.");
  }

  // Check for special commands (Rose, Thorn, Bud format)
  const roseMatch = text.match(/^#rose\s*[:]*\s*(.*)/i);
  const thornMatch = text.match(/^#thorn\s*[:]*\s*(.*)/i);
  const budMatch = text.match(/^#bud\s*[:]*\s*(.*)/i);

  if (roseMatch && roseMatch[1]) {
    // Save as a Rose contribution
    const content = roseMatch[1].trim();
    const saved = await saveContribution(userId, 'rose', content);
    
    if (saved) {
      return whatsapp.sendTextMessage(
        from, 
        userId, 
        "Thank you for sharing a positive practice! Your knowledge has been saved. Share more or use menu options to explore other features."
      );
    } else {
      return whatsapp.sendTextMessage(
        from, 
        userId, 
        "Sorry, we couldn't save your contribution. Please try again later."
      );
    }
  } else if (thornMatch && thornMatch[1]) {
    // Save as a Thorn contribution
    const content = thornMatch[1].trim();
    const saved = await saveContribution(userId, 'thorn', content);
    
    if (saved) {
      return whatsapp.sendTextMessage(
        from, 
        userId, 
        "Thank you for sharing a challenge you faced. Your knowledge has been saved. Share more or use menu options to explore other features."
      );
    } else {
      return whatsapp.sendTextMessage(
        from, 
        userId, 
        "Sorry, we couldn't save your contribution. Please try again later."
      );
    }
  } else if (budMatch && budMatch[1]) {
    // Save as a Bud contribution
    const content = budMatch[1].trim();
    const saved = await saveContribution(userId, 'bud', content);
    
    if (saved) {
      return whatsapp.sendTextMessage(
        from, 
        userId, 
        "Thank you for sharing your new idea! Your knowledge has been saved. Share more or use menu options to explore other features."
      );
    } else {
      return whatsapp.sendTextMessage(
        from, 
        userId, 
        "Sorry, we couldn't save your contribution. Please try again later."
      );
    }
  }

  // Handle session state-specific text responses
  if (session.session_data.state === 'rescheduling') {
    // Process rescheduling request (parsing date/time from text)
    // This would be more complex in production with proper date parsing
    return whatsapp.sendTextMessage(
      from, 
      userId, 
      "Thanks for your reschedule request. Your meeting coordinator will contact you to confirm the new time."
    );
  }

  // Default response - send main menu
  return whatsapp.sendMainMenu(from, userId);
}

// Handle interactive message response (buttons, lists)
async function handleInteractiveMessage(from, userId, messageId, interactive) {
  // Store the message in the database
  await storeMessage(messageId, userId, from, JSON.stringify(interactive), 'interactive');

  // Get or create the user's session
  const session = await getOrCreateSession(userId, from);

  if (!session) {
    console.error('Failed to get or create session');
    return whatsapp.sendTextMessage(from, userId, "We're experiencing technical difficulties. Please try again later.");
  }

  let buttonReply;
  let listReply;

  if (interactive.type === 'button_reply') {
    buttonReply = interactive.button_reply;
    
    // Process button selection
    switch (buttonReply.id) {
      case 'KNOWLEDGE_SHARING':
        // Update session state
        await supabase
          .from('whatsapp_sessions')
          .update({ 
            session_data: { state: 'knowledge_sharing' },
            updated_at: new Date().toISOString()
          })
          .eq('id', session.id);
        
        return whatsapp.sendKnowledgeSharingOptions(from, userId);
        
      case 'MEETINGS':
        // Update session state
        await supabase
          .from('whatsapp_sessions')
          .update({ 
            session_data: { state: 'meetings' },
            updated_at: new Date().toISOString()
          })
          .eq('id', session.id);
        
        return whatsapp.sendMeetingInformation(from, userId);
        
      case 'PERFORMANCE':
        // Update session state
        await supabase
          .from('whatsapp_sessions')
          .update({ 
            session_data: { state: 'performance' },
            updated_at: new Date().toISOString()
          })
          .eq('id', session.id);
        
        return whatsapp.sendPerformanceSnapshot(from, userId);
        
      case 'VIEW_KNOWLEDGE':
        return whatsapp.sendTextMessage(
          from, 
          userId, 
          "This feature is coming soon. You'll be able to browse knowledge shared by your peers."
        );
        
      case 'BEST_PRACTICES':
        return whatsapp.sendTextMessage(
          from, 
          userId, 
          "This feature is coming soon. You'll be able to see curated best practices from your peers."
        );
        
      case 'BACK_MAIN':
        // Update session state
        await supabase
          .from('whatsapp_sessions')
          .update({ 
            session_data: { state: 'main_menu' },
            updated_at: new Date().toISOString()
          })
          .eq('id', session.id);
        
        return whatsapp.sendMainMenu(from, userId);
        
      default:
        return whatsapp.sendMainMenu(from, userId);
    }
  } else if (interactive.type === 'list_reply') {
    listReply = interactive.list_reply;
    
    // Process list selection (implement as needed)
    return whatsapp.sendTextMessage(
      from, 
      userId, 
      `You selected: ${listReply.title}`
    );
  }

  // Default fallback
  return whatsapp.sendMainMenu(from, userId);
}

// Webhook handler
export default async function handler(req, res) {
  // Track this webhook request
  const tracker = trackWebhookRequest(req);
  
  // Record that we received a webhook for health monitoring
  recordWebhookReceived();
  
  try {
    // Handle GET requests (webhook verification)
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      // Check if token and mode are in the query string
      if (!mode || !token) {
        console.error('Missing query parameters');
        return res.status(400).json({ error: 'Missing query parameters' });
      }

      // Check the mode and token
      if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
        // Respond with the challenge token
        console.log('WEBHOOK_VERIFIED');
        return res.status(200).send(challenge);
      } else {
        // Respond with '403 Forbidden' if verify tokens do not match
        console.error('Verification failed');
        return res.status(403).json({ error: 'Verification failed' });
      }
    }
    
    // Handle POST requests (incoming messages/status updates)
    if (req.method === 'POST') {
      const body = req.body;

      // Verify the request signature
      if (!verifyWebhookSignature(req)) {
        console.error('Invalid signature');
        return res.status(401).json({ error: 'Invalid signature' });
      }

      // Log the webhook event
      console.log('Received webhook event:', JSON.stringify(body, null, 2));

      // Process the webhook with proper error handling
      try {
        // Process the webhook data
        if (body.object === 'whatsapp_business_account') {
          if (body.entry && body.entry.length > 0) {
            for (const entry of body.entry) {
              if (entry.changes && entry.changes.length > 0) {
                for (const change of entry.changes) {
                  if (change.value && change.value.messages && change.value.messages.length > 0) {
                    // Process incoming messages
                    for (const message of change.value.messages) {
                      const from = message.from;
                      const messageId = message.id;
                      
                      // Get the user by phone number
                      const user = await getOfficerByPhone(from);
                      
                      if (!user) {
                        console.error(`No user found for phone number: ${from}`);
                        // Send a message to unregistered user
                        await whatsapp.sendTextMessage(
                          from, 
                          null, 
                          "Your number is not registered in our system. Please contact your administrator."
                        );
                        continue;
                      }
                      
                      // Process different message types
                      if (message.type === 'text' && message.text) {
                        await handleTextMessage(from, user.id, messageId, message.text.body);
                      } else if (message.type === 'interactive' && message.interactive) {
                        await handleInteractiveMessage(from, user.id, messageId, message.interactive);
                      } else if (message.type === 'button' && message.button) {
                        // Store button message
                        await storeMessage(messageId, user.id, from, JSON.stringify(message.button), 'button');
                        
                        // Process button message payload
                        const payload = message.button.payload;
                        
                        if (payload.startsWith('CONFIRM_MEETING_')) {
                          const meetingId = payload.replace('CONFIRM_MEETING_', '');
                          await whatsapp.handleMeetingConfirmation(from, user.id, meetingId);
                        } else if (payload.startsWith('RESCHEDULE_MEETING_')) {
                          const meetingId = payload.replace('RESCHEDULE_MEETING_', '');
                          await whatsapp.startReschedulingFlow(from, user.id, meetingId);
                        } else {
                          // Default response for unknown button payload
                          await whatsapp.sendMainMenu(from, user.id);
                        }
                      } else {
                        // Handle other message types (media, etc.)
                        await storeMessage(messageId, user.id, from, JSON.stringify(message), message.type);
                        await whatsapp.sendTextMessage(
                          from, 
                          user.id, 
                          "Thank you for your message. How can I assist you today?"
                        );
                      }
                    }
                  }

                  // Process status updates
                  if (change.value && change.value.statuses && change.value.statuses.length > 0) {
                    for (const status of change.value.statuses) {
                      // Update message status in database
                      await updateMessageStatus(status.id, status.status);
                    }
                  }
                }
              }
            }
          }
        }
        
        // End tracking with success
        tracker.end({ success: true });
        
        // Return success
        return res.status(200).send('EVENT_RECEIVED');
      } catch (error) {
        // Log the processing error but still return 200 to Meta
        console.error('Error processing webhook:', error);
        logEvent('WEBHOOK_ERROR', {
          error: error.message,
          stack: error.stack,
          payload: req.body
        });
        
        // End tracking with error
        tracker.end({ 
          success: false, 
          error: error.message 
        });
        
        // Return 200 to acknowledge receipt to Meta
        // This prevents Meta from retrying due to server errors
        return res.status(200).send('EVENT_RECEIVED');
      }
    }
    
    // Method not allowed
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  } catch (error) {
    // Handle catastrophic errors
    console.error('Webhook critical error:', error);
    logEvent('WEBHOOK_CRITICAL_ERROR', {
      error: error.message,
      stack: error.stack
    });
    
    // End tracking with critical error
    tracker.end({ 
      success: false, 
      error: error.message,
      critical: true
    });
    
    // Still return 200 to Meta to prevent retries
    return res.status(200).send('ERROR_HANDLED');
  }
} 