/**
 * Error handling utilities for the WhatsApp webhook implementation
 */

// Check if an error is retryable based on status code or error type
export function isRetryableError(error) {
  if (!error || !error.response) return false;
  
  const statusCode = error.response.status;
  
  // Rate limit errors (429) and server errors (5xx) are retryable
  if (statusCode === 429 || (statusCode >= 500 && statusCode < 600)) {
    return true;
  }
  
  // Check for network-related errors
  if (error.code === 'ECONNRESET' || 
      error.code === 'ETIMEDOUT' || 
      error.code === 'ECONNREFUSED' || 
      error.message.includes('network')) {
    return true;
  }
  
  return false;
}

// Calculate delay for exponential backoff
export function calculateBackoffDelay(attempt, baseDelay = 1000, maxDelay = 60000) {
  // Exponential backoff formula: baseDelay * 2^attempt + random jitter
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * 1000; // Random jitter between 0-1000ms
  
  // Cap the delay at maxDelay
  return Math.min(exponentialDelay + jitter, maxDelay);
}

// Execute a function with retries and exponential backoff
export async function executeWithRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    baseDelay = 1000,
    maxDelay = 60000,
    onRetry = null,
    retryableErrors = null
  } = options;
  
  let attempt = 0;
  
  while (true) {
    try {
      return await fn();
    } catch (error) {
      attempt++;
      
      const shouldRetry = retryableErrors 
        ? retryableErrors.some(errType => error instanceof errType || error.name === errType)
        : isRetryableError(error);
      
      if (!shouldRetry || attempt >= maxRetries) {
        throw error;
      }
      
      const delay = calculateBackoffDelay(attempt, baseDelay, maxDelay);
      
      if (onRetry) {
        onRetry({
          error,
          attempt,
          delay,
          maxRetries
        });
      }
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

// Log errors to the appropriate destination
export function logError(error, context = {}) {
  const errorInfo = {
    message: error.message,
    stack: error.stack,
    code: error.code,
    response: error.response ? {
      status: error.response.status,
      data: error.response.data
    } : null,
    context,
    timestamp: new Date().toISOString()
  };
  
  console.error('WhatsApp API Error:', JSON.stringify(errorInfo, null, 2));
  
  // In production, you might want to log to a service like Sentry or LogRocket
  if (process.env.NODE_ENV === 'production' && typeof window === 'undefined') {
    // Example: send error to logging service
    // await logToService(errorInfo);
  }
  
  return errorInfo;
} 