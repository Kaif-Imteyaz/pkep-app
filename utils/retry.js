/**
 * Utility for handling retries with exponential backoff
 * Used for API calls that might fail temporarily
 */

/**
 * Execute a function with retry logic using exponential backoff
 * 
 * @param {Function} fn - The async function to execute
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retry attempts (default: 3)
 * @param {number} options.initialDelay - Initial delay in ms (default: 1000)
 * @param {number} options.maxDelay - Maximum delay in ms (default: 30000)
 * @param {number} options.factor - Backoff factor (default: 2)
 * @param {Function} options.shouldRetry - Function to determine if retry should happen (default: all errors)
 * @returns {Promise<any>} - The result of the function execution
 */
export async function withRetry(fn, options = {}) {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 30000,
    factor = 2,
    shouldRetry = () => true,
    onRetry = null
  } = options;

  let lastError = null;
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      attempt += 1;
      
      // If we've used all retries or shouldn't retry this error, throw
      if (attempt > maxRetries || !shouldRetry(error, attempt)) {
        throw error;
      }
      
      // Calculate delay with exponential backoff and jitter
      const delay = Math.min(
        maxDelay,
        initialDelay * Math.pow(factor, attempt - 1) * (0.8 + Math.random() * 0.4)
      );
      
      // Log retry attempt
      console.log(`Retry attempt ${attempt}/${maxRetries} after ${Math.round(delay)}ms:`, error.message);
      
      // Call onRetry callback if provided
      if (onRetry && typeof onRetry === 'function') {
        onRetry(error, attempt, delay);
      }
      
      // Wait before trying again
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  // Should not reach here, but just in case
  throw lastError;
}

/**
 * Utility for retrying specific WhatsApp API requests
 * 
 * @param {Function} apiCall - The API call function to retry
 * @param {Object} options - Additional retry options
 * @returns {Promise<any>} - The API response
 */
export function retryWhatsAppApi(apiCall, options = {}) {
  return withRetry(apiCall, {
    maxRetries: 5,
    initialDelay: 1000,
    shouldRetry: (error) => {
      // Retry on rate limits (429) and server errors (5xx)
      const statusCode = error.response?.status;
      return statusCode === 429 || (statusCode >= 500 && statusCode < 600);
    },
    ...options
  });
}

/**
 * Utility for retrying database operations
 * 
 * @param {Function} dbOperation - The database operation to retry
 * @param {Object} options - Additional retry options
 * @returns {Promise<any>} - The database operation result
 */
export function retryDatabaseOperation(dbOperation, options = {}) {
  return withRetry(dbOperation, {
    maxRetries: 3,
    initialDelay: 500,
    shouldRetry: (error) => {
      // Retry on connection errors or deadlocks
      return (
        error.message.includes('connection') ||
        error.message.includes('deadlock') ||
        error.code === '40001' || // PostgreSQL deadlock
        error.code === '40P01'    // PostgreSQL serialization failure
      );
    },
    ...options
  });
} 