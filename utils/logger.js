/**
 * Logger utility for PKEP WhatsApp Integration
 * Provides consistent logging across the application
 */

// Log levels
const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR',
  WEBHOOK: 'WEBHOOK'
};

// Get environment setting
const NODE_ENV = process.env.NODE_ENV || 'development';
const DEBUG_MODE = process.env.DEBUG_MODE === 'true';

/**
 * Format a log message with timestamp, level, and source
 * 
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {string} source - Source of the log message
 * @returns {string} Formatted log message
 */
function formatLogMessage(level, message, source) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${source ? `[${source}] ` : ''}${message}`;
}

/**
 * Log a message at a specific level
 * 
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {string} source - Source of the log (module/function name)
 * @param {any} data - Additional data to log
 */
function log(level, message, source = '', data = null) {
  // Skip debug logs unless in development or debug mode is enabled
  if (level === LOG_LEVELS.DEBUG && NODE_ENV !== 'development' && !DEBUG_MODE) {
    return;
  }
  
  const formattedMessage = formatLogMessage(level, message, source);
  
  switch (level) {
    case LOG_LEVELS.ERROR:
      console.error(formattedMessage);
      if (data) console.error(data);
      break;
    case LOG_LEVELS.WARN:
      console.warn(formattedMessage);
      if (data) console.warn(data);
      break;
    case LOG_LEVELS.DEBUG:
    case LOG_LEVELS.INFO:
    case LOG_LEVELS.WEBHOOK:
    default:
      console.log(formattedMessage);
      if (data) console.log(data);
      break;
  }
}

/**
 * Log a debug message
 * 
 * @param {string} message - Message to log
 * @param {string} source - Source of the log
 * @param {any} data - Additional data to log
 */
export function logDebug(message, source = '', data = null) {
  log(LOG_LEVELS.DEBUG, message, source, data);
}

/**
 * Log an info message
 * 
 * @param {string} message - Message to log
 * @param {string} source - Source of the log
 * @param {any} data - Additional data to log
 */
export function logInfo(message, source = '', data = null) {
  log(LOG_LEVELS.INFO, message, source, data);
}

/**
 * Log a warning message
 * 
 * @param {string} message - Message to log
 * @param {string} source - Source of the log
 * @param {any} data - Additional data to log
 */
export function logWarning(message, source = '', data = null) {
  log(LOG_LEVELS.WARN, message, source, data);
}

/**
 * Log an error message
 * 
 * @param {string} message - Message to log
 * @param {string} source - Source of the log
 * @param {Error|any} error - Error object or data to log
 */
export function logError(message, source = '', error = null) {
  log(LOG_LEVELS.ERROR, message, source, error);
}

/**
 * Log an incoming webhook message
 * 
 * @param {string} message - Message to log
 * @param {any} data - Webhook data to log (will be sanitized)
 */
export function logWebhook(message, data = null) {
  log(LOG_LEVELS.WEBHOOK, message, 'Webhook', sanitizeWebhookData(data));
}

/**
 * Sanitize webhook data to remove sensitive information
 * 
 * @param {any} data - Data to sanitize
 * @returns {any} Sanitized data
 */
export function sanitizeWebhookData(data) {
  if (!data) return null;
  
  try {
    // Create a deep copy to avoid modifying original
    const sanitized = JSON.parse(JSON.stringify(data));
    
    // Sanitize specific fields as needed
    // Example: redact phone numbers in changes array
    if (sanitized.entry && Array.isArray(sanitized.entry)) {
      sanitized.entry.forEach(entry => {
        if (entry.changes && Array.isArray(entry.changes)) {
          entry.changes.forEach(change => {
            if (change.value && change.value.metadata && change.value.metadata.phone_number_id) {
              // Keep this for reference but indicate it's a sensitive field
              change.value.metadata.phone_number_id = '[REDACTED]';
            }
            
            if (change.value && change.value.contacts && Array.isArray(change.value.contacts)) {
              change.value.contacts.forEach(contact => {
                if (contact.wa_id) {
                  // Keep last 4 digits for troubleshooting
                  contact.wa_id = `xxxx${contact.wa_id.slice(-4)}`;
                }
              });
            }
          });
        }
      });
    }
    
    return sanitized;
  } catch (error) {
    console.error('Error sanitizing webhook data:', error);
    return { error: 'Error sanitizing data', original: data };
  }
} 