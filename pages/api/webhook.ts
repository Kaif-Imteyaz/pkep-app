import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

// Webhook verification token from environment variables
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'your_verify_token';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || 'your_app_secret';

// Verify webhook signature from WhatsApp
function verifyWebhookSignature(req: NextApiRequest): boolean {
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const startTime = performance.now();
  
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-hub-signature-256');

  // Handle OPTIONS request for CORS
  if (req.method === 'OPTIONS') {
    console.log('[WEBHOOK] Handling OPTIONS request');
    res.status(200).end();
    return;
  }

  try {
    console.log('[WEBHOOK] Request details:', {
      method: req.method,
      url: req.url,
      query: req.query,
      headers: req.headers,
      body: req.body
    });
    
    // Handle GET requests (webhook verification)
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'] as string;
      const token = req.query['hub.verify_token'] as string;
      const challenge = req.query['hub.challenge'] as string;

      console.log('[WEBHOOK] Verification attempt:', { 
        mode, 
        token: token ? '****' : undefined,
        challenge,
        expectedToken: WEBHOOK_VERIFY_TOKEN ? '****' : undefined
      });

      // Check if token and mode are in the query string
      if (!mode || !token || !challenge) {
        console.error('[WEBHOOK] Missing required parameters');
        return res.status(400).json({ 
          error: 'Missing query parameters',
          required: ['hub.mode', 'hub.verify_token', 'hub.challenge'],
          received: {
            mode: mode || undefined,
            token: token ? 'provided' : undefined,
            challenge: challenge || undefined
          }
        });
      }

      // Check the mode and token
      if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
        const duration = performance.now() - startTime;
        console.log(`[WEBHOOK] Verification successful in ${duration.toFixed(2)}ms`);
        console.log('[WEBHOOK] Responding with challenge:', challenge);
        return res.status(200).send(challenge);
      }

      // Respond with '403 Forbidden' if tokens do not match
      console.error('[WEBHOOK] Verification failed:', {
        invalidMode: mode !== 'subscribe',
        tokenMismatch: token !== WEBHOOK_VERIFY_TOKEN
      });
      return res.status(403).json({ 
        error: 'Verification failed',
        details: {
          invalidMode: mode !== 'subscribe',
          tokenMismatch: true
        }
      });
    }

    // Handle POST requests (webhook events)
    if (req.method === 'POST') {
      console.log('[WEBHOOK] Processing POST request');
      
      // Verify webhook signature
      if (!verifyWebhookSignature(req)) {
        const duration = performance.now() - startTime;
        console.error(`[WEBHOOK] Signature verification failed in ${duration.toFixed(2)}ms`);
        return res.status(403).json({ error: 'Invalid signature' });
      }

      const body = req.body;
      console.log('[WEBHOOK] Request body:', JSON.stringify(body, null, 2));

      // Process WhatsApp messages
      if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry) {
          console.log('[WEBHOOK] Processing entry:', entry.id);
          for (const change of entry.changes) {
            if (change.value.messages) {
              for (const message of change.value.messages) {
                const messageStartTime = performance.now();
                const from = message.from;
                const messageId = message.id;

                // Handle different message types
                if (message.type === 'text') {
                  console.log(`[MESSAGE] Processing text from ${from}: ${message.text.body}`);
                }

                const messageDuration = performance.now() - messageStartTime;
                console.log(`[MESSAGE] Processed message ${messageId} in ${messageDuration.toFixed(2)}ms`);
              }
            }
          }
        }
      } else {
        console.warn('[WEBHOOK] Unexpected object type:', body.object);
      }
      
      const duration = performance.now() - startTime;
      console.log(`[WEBHOOK] Request processed in ${duration.toFixed(2)}ms`);
      
      return res.status(200).send("EVENT_RECEIVED");
    }

    console.warn('[WEBHOOK] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`[WEBHOOK_ERROR] Request failed after ${duration.toFixed(2)}ms:`, error);
    return res.status(500).json({ error: 'Internal server error' });
  }
} 