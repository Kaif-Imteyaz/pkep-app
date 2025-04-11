/**
 * Utilities for monitoring webhook events and performance
 */

import { supabase } from '../lib/supabase';

/**
 * Event types for monitoring
 */
export const EventType = {
  WEBHOOK_RECEIVED: 'webhook_received',
  WEBHOOK_PROCESSED: 'webhook_processed',
  WEBHOOK_ERROR: 'webhook_error',
  MESSAGE_SENT: 'message_sent',
  MESSAGE_DELIVERED: 'message_delivered',
  MESSAGE_READ: 'message_read',
  API_ERROR: 'api_error',
  DATABASE_ERROR: 'database_error',
};

/**
 * Log an event to the monitoring system
 * 
 * @param {string} type - Event type (from EventType enum)
 * @param {Object} data - Event data
 * @param {string} source - Source of the event (e.g., 'webhook', 'whatsapp-api')
 * @returns {Promise<void>}
 */
export async function logEvent(type, data, source = 'webhook') {
  const timestamp = new Date().toISOString();
  
  try {
    // Store in database
    const { error } = await supabase
      .from('monitoring_events')
      .insert({
        type,
        data,
        source,
        timestamp,
      });
    
    if (error) {
      console.error('Error storing monitoring event:', error);
    }
    
    // Log to console for debugging
    console.log(`[MONITOR] ${timestamp} - ${type} from ${source}:`, data);
  } catch (err) {
    // Fail silently - monitoring shouldn't break main functions
    console.error('Failed to log monitoring event:', err);
  }
}

// Performance monitoring
const timers = new Map();

/**
 * Start timing an operation
 * 
 * @param {string} operationId - Unique ID for the operation
 * @param {Object} metadata - Additional metadata about the operation
 */
export function startTimer(operationId, metadata = {}) {
  timers.set(operationId, {
    startTime: performance.now(),
    metadata
  });
}

/**
 * End timing an operation and log its duration
 * 
 * @param {string} operationId - Unique ID for the operation (must match one used in startTimer)
 * @param {Object} additionalData - Additional data to include in the log
 * @returns {number} - The duration in milliseconds
 */
export function endTimer(operationId, additionalData = {}) {
  const timerData = timers.get(operationId);
  
  if (!timerData) {
    console.warn(`No timer found for operation: ${operationId}`);
    return 0;
  }
  
  const duration = performance.now() - timerData.startTime;
  timers.delete(operationId);
  
  // Log performance data
  logEvent('performance', {
    operationId,
    durationMs: Math.round(duration),
    ...timerData.metadata,
    ...additionalData
  }, 'performance-monitor');
  
  return duration;
}

/**
 * Track a webhook request from start to finish
 * 
 * @param {Object} req - The request object
 * @param {string} eventType - The type of webhook event
 * @param {string} messageId - The WhatsApp message ID (if applicable)
 */
export function trackWebhookRequest(req, eventType, messageId = null) {
  const requestId = `webhook-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  
  // Start the timer
  startTimer(requestId, {
    eventType,
    messageId,
    method: req.method,
    url: req.url,
    userAgent: req.headers['user-agent'],
  });
  
  // Log that we received the webhook
  logEvent(EventType.WEBHOOK_RECEIVED, {
    requestId,
    eventType,
    messageId,
    timestamp: new Date().toISOString(),
  });
  
  return {
    requestId,
    complete: (result, error = null) => {
      const eventType = error ? EventType.WEBHOOK_ERROR : EventType.WEBHOOK_PROCESSED;
      
      // Log the completion event
      logEvent(eventType, {
        requestId,
        result,
        error: error ? { message: error.message, stack: error.stack } : null,
      });
      
      // End the timer
      endTimer(requestId, {
        success: !error,
        result,
        error: error ? error.message : null,
      });
    }
  };
} 