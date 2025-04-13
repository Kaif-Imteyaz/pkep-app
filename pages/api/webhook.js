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
      }

      // Respond with '403 Forbidden' if tokens do not match
      console.error('Verification failed');
      return res.status(403).json({ error: 'Verification failed' });
    }

    // Handle POST requests (webhook events)
    if (req.method === 'POST') {
      // Verify webhook signature
      if (!verifyWebhookSignature(req)) {
        console.error('Invalid webhook signature');
        return res.status(403).json({ error: 'Invalid signature' });
      }

      const body = req.body;
      console.log('Received webhook:', JSON.stringify(body, null, 2));

      // Check if this is a WhatsApp message
      if (body.object === 'whatsapp_business_account') {
        // Process each entry
        for (const entry of body.entry) {
          // Process each change
          for (const change of entry.changes) {
            // Process each message
            for (const message of change.value.messages || []) {
              const from = message.from;
              const userId = change.value.metadata.phone_number_id;
              const messageId = message.id;

              // Handle different message types
              if (message.type === 'text') {
                await handleTextMessage(from, userId, messageId, message.text.body);
              } else if (message.type === 'interactive') {
                await handleInteractiveMessage(from, userId, messageId, message.interactive);
              }
            }
          }
        }
      }

      // Return a 200 OK response
      return res.status(200).json({ status: 'ok' });
    }

    // Return 405 Method Not Allowed for other HTTP methods
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 