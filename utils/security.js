import crypto from 'crypto';

// Environment Variables
const APP_SECRET = process.env.WHATSAPP_APP_SECRET;
const WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;

/**
 * Verify webhook request
 * Used when Meta attempts to verify webhook URL by sending a GET request
 * 
 * @param {string} mode - Mode parameter sent by Meta (should be 'subscribe')
 * @param {string} token - Token parameter sent by Meta (should match WEBHOOK_VERIFY_TOKEN)
 * @param {string} challenge - Challenge parameter sent by Meta (should be returned if verification succeeds)
 * @returns {object} Object with success status and challenge/error message
 */
export function verifyWebhook(mode, token, challenge) {
  // Validate mode and token
  if (mode !== 'subscribe') {
    return {
      success: false,
      error: 'Invalid mode parameter. Expected "subscribe".'
    };
  }
  
  if (token !== WEBHOOK_VERIFY_TOKEN) {
    return {
      success: false,
      error: 'Invalid verify token. Token does not match environment configuration.'
    };
  }
  
  // Return challenge for successful verification
  return {
    success: true,
    challenge: challenge
  };
}

/**
 * Verify the signature of a webhook payload
 * Used to ensure requests are genuinely from Meta
 * 
 * @param {string} signature - X-Hub-Signature-256 header value
 * @param {string|object} payload - Request body (raw string or parsed object)
 * @returns {boolean} Whether signature is valid
 */
export function verifySignature(signature, payload) {
  if (!APP_SECRET || !signature) {
    console.error('Missing app secret or signature');
    return false;
  }
  
  try {
    // Convert payload to string if it's not already
    const stringBody = typeof payload === 'string' 
      ? payload 
      : JSON.stringify(payload);
    
    // Generate expected signature
    const hmac = crypto.createHmac('sha256', APP_SECRET);
    hmac.update(stringBody);
    const expectedSignature = `sha256=${hmac.digest('hex')}`;
    
    // Use crypto.timingSafeEqual to prevent timing attacks
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expectedSignature);
    
    // Verify signatures match (handles potential length differences)
    if (sigBuffer.length !== expectedBuffer.length) {
      return false;
    }
    
    return crypto.timingSafeEqual(sigBuffer, expectedBuffer);
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

/**
 * Create a custom signature for outgoing requests
 * Can be used if need to sign our requests to external services
 * 
 * @param {string|object} payload - Request body to sign
 * @param {string} secret - Secret key to use for signing
 * @returns {string} Signature
 */
export function createSignature(payload, secret = APP_SECRET) {
  try {
    // Convert payload to string if it's not already
    const stringBody = typeof payload === 'string' 
      ? payload 
      : JSON.stringify(payload);
    
    // Generate signature
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(stringBody);
    return `sha256=${hmac.digest('hex')}`;
  } catch (error) {
    console.error('Error creating signature:', error);
    throw new Error('Failed to create signature');
  }
}

/**
 * Generate a random secure token
 * Useful for creating verify tokens or similar security strings
 * 
 * @param {number} length - Length of token to generate (default: 32)
 * @returns {string} Random secure token
 */
export function generateSecureToken(length = 32) {
  return crypto.randomBytes(length).toString('hex');
} 