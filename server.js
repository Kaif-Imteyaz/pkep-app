import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config();

const app = express();
const PORT = process.env.API_PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Webhook verification token from environment variables
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || 'your_verify_token';
const FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || 'your_app_secret';

// Test route
app.get('/', (req, res) => {
  res.json({ status: 'Server is running' });
});

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

// Webhook endpoint
const webhookHandler = async (req, res) => {
  const startTime = performance.now();
  try {
    console.log('Received webhook request:', req.method);
    console.log('Query parameters:', req.query);
    console.log('Headers:', req.headers);
    
    // Handle GET requests (webhook verification)
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      console.log('Webhook verification request:', { mode, token, challenge });

      // Check if token and mode are in the query string
      if (!mode || !token) {
        console.error('Missing query parameters');
        return res.status(400).json({ 
          error: 'Missing query parameters',
          required: ['hub.mode', 'hub.verify_token', 'hub.challenge'],
          received: req.query 
        });
      }

      // Check the mode and token
      if (mode === 'subscribe' && token === WEBHOOK_VERIFY_TOKEN) {
        // Respond with the challenge token
        const duration = performance.now() - startTime;
        console.log(`[WEBHOOK] Verification successful in ${duration.toFixed(2)}ms`);
        return res.status(200).send(challenge);
      }

      // Respond with '403 Forbidden' if tokens do not match
      console.error('Verification failed');
      return res.status(403).json({ 
        error: 'Verification failed',
        details: 'Token mismatch or invalid mode'
      });
    }

    // Handle POST requests (webhook events)
    if (req.method === 'POST') {
      // Verify webhook signature
      if (!verifyWebhookSignature(req)) {
        const duration = performance.now() - startTime;
        console.error(`[WEBHOOK] Signature verification failed in ${duration.toFixed(2)}ms`);
        return res.status(403).json({ error: 'Invalid signature' });
      }

      const body = req.body;
      console.log('Received webhook body:', JSON.stringify(body, null, 2));

      // Process WhatsApp messages
      if (body.object === 'whatsapp_business_account') {
        for (const entry of body.entry) {
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
      }
      
      const duration = performance.now() - startTime;
      console.log(`[WEBHOOK] Request processed in ${duration.toFixed(2)}ms`);
      
      res.status(200).send("EVENT_RECEIVED");
    } else {
      res.status(405).send("Method not allowed");
    }
  } catch (error) {
    const duration = performance.now() - startTime;
    console.error(`[WEBHOOK_ERROR] Request failed after ${duration.toFixed(2)}ms:`, error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Register webhook endpoints
app.all('/webhook/whatsapp', webhookHandler);
app.all('/webhook', webhookHandler);
app.all('/api/webhook', webhookHandler);

// Start server
app.listen(PORT, () => {
  console.log(`API Server running on port ${PORT}`);
}); 