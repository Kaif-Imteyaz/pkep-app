import crypto from 'crypto';

/**
 * Verifies the webhook signature from WhatsApp
 * 
 * @param {string} signature - X-Hub-Signature-256 header from the request
 * @param {string} body - Raw request body as string
 * @param {string} appSecret - Facebook app secret
 * @returns {boolean} Whether the signature is valid
 */
export function verifyWebhookSignature(signature, body, appSecret) {
  if (!signature || !body || !appSecret) {
    console.warn('Missing parameters for webhook verification');
    return false;
  }

  try {
    // Extract the received signature value (after "sha256=")
    const receivedSignature = signature.startsWith('sha256=') 
      ? signature.substring(7) 
      : signature;

    // Calculate the expected signature
    const expectedSignature = crypto
      .createHmac('sha256', appSecret)
      .update(body)
      .digest('hex');

    // Use a constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(receivedSignature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

/**
 * Rate limiting tracker
 * Basic implementation that tracks requests per IP address
 */
const rateLimitTracker = {
  requests: new Map(),
  cleanupInterval: null,
  
  // Initialize cleanup interval
  init(cleanupIntervalMs = 60000) {
    if (!this.cleanupInterval) {
      this.cleanupInterval = setInterval(() => this.cleanup(), cleanupIntervalMs);
      // Ensure cleanup interval doesn't prevent Node from exiting
      this.cleanupInterval.unref();
    }
  },
  
  // Clean up old entries
  cleanup() {
    const now = Date.now();
    for (const [key, data] of this.requests.entries()) {
      if (now - data.timestamp > 60000) { // Remove entries older than 1 minute
        this.requests.delete(key);
      }
    }
  },
  
  // Check if a request is allowed based on rate limits
  isAllowed(ip, limit = 60) {
    const now = Date.now();
    
    if (!this.requests.has(ip)) {
      this.requests.set(ip, {
        count: 1,
        timestamp: now
      });
      return true;
    }
    
    const data = this.requests.get(ip);
    
    // Reset counter if it's been more than a minute
    if (now - data.timestamp > 60000) {
      data.count = 1;
      data.timestamp = now;
      return true;
    }
    
    // Check if we're over the limit
    if (data.count >= limit) {
      return false;
    }
    
    // Increment the counter
    data.count += 1;
    return true;
  }
};

/**
 * Rate limiting middleware for the webhook
 * 
 * @param {object} req - HTTP request object
 * @param {object} res - HTTP response object
 * @returns {boolean} Whether the request should proceed
 */
export function checkRateLimit(req, res) {
  // Initialize the rate limiter if not already running
  rateLimitTracker.init();
  
  // Get client IP
  const clientIp = req.headers['x-forwarded-for'] || 
                  req.connection.remoteAddress ||
                  'unknown';
  
  // Check if this IP is allowed
  if (!rateLimitTracker.isAllowed(clientIp)) {
    console.warn(`Rate limit exceeded for IP: ${clientIp}`);
    res.status(429).json({ 
      error: 'Too many requests', 
      message: 'Rate limit exceeded. Please try again later.'
    });
    return false;
  }
  
  return true;
}

/**
 * Validates WhatsApp webhook request parameters
 * 
 * @param {object} query - Request query parameters
 * @param {string} verifyToken - Expected verification token
 * @returns {boolean} Whether the request is valid
 */
export function validateWebhookParams(query, verifyToken) {
  // Check if mode and token are in the query and match expected values
  return (
    query['hub.mode'] === 'subscribe' &&
    query['hub.verify_token'] === verifyToken
  );
}

/**
 * Validate that the webhook payload has required fields
 * 
 * @param {object} body - Parsed request body
 * @returns {boolean} Whether the payload is valid
 */
export function validateWebhookPayload(body) {
  return (
    body &&
    body.object === 'whatsapp_business_account' &&
    body.entry &&
    Array.isArray(body.entry) &&
    body.entry.length > 0
  );
}

/**
 * Extract messages from webhook payload
 * 
 * @param {object} body - Parsed request body
 * @returns {Array|null} Array of message objects or null if no valid messages
 */
export function extractMessages(body) {
  try {
    // Check if this is a valid WhatsApp webhook payload
    if (!validateWebhookPayload(body)) {
      return null;
    }
    
    const messages = [];
    
    for (const entry of body.entry) {
      if (entry.changes && Array.isArray(entry.changes)) {
        for (const change of entry.changes) {
          if (change.value && change.value.messages && Array.isArray(change.value.messages)) {
            // Add metadata to each message
            for (const message of change.value.messages) {
              messages.push({
                ...message,
                metadata: {
                  phone_number_id: change.value.metadata?.phone_number_id,
                  display_phone_number: change.value.metadata?.display_phone_number
                }
              });
            }
          }
        }
      }
    }
    
    return messages.length > 0 ? messages : null;
  } catch (error) {
    console.error('Error extracting messages from webhook payload:', error);
    return null;
  }
}

/**
 * Extract status updates from webhook payload
 * 
 * @param {object} body - Parsed request body
 * @returns {Array|null} Array of status update objects or null if no valid statuses
 */
export function extractStatusUpdates(body) {
  try {
    // Check if this is a valid WhatsApp webhook payload
    if (!validateWebhookPayload(body)) {
      return null;
    }
    
    const statuses = [];
    
    for (const entry of body.entry) {
      if (entry.changes && Array.isArray(entry.changes)) {
        for (const change of entry.changes) {
          if (change.value && change.value.statuses && Array.isArray(change.value.statuses)) {
            // Add metadata to each status
            for (const status of change.value.statuses) {
              statuses.push({
                ...status,
                metadata: {
                  phone_number_id: change.value.metadata?.phone_number_id,
                  display_phone_number: change.value.metadata?.display_phone_number
                }
              });
            }
          }
        }
      }
    }
    
    return statuses.length > 0 ? statuses : null;
  } catch (error) {
    console.error('Error extracting status updates from webhook payload:', error);
    return null;
  }
} 