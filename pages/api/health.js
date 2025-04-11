/**
 * Health check endpoint for the WhatsApp webhook service
 * This endpoint is used by monitoring services to check if the webhook is operational
 */

import { createClient } from '@supabase/supabase-js';
import { logEvent } from '../../utils/monitoring';

// Variables to track health status
let lastWebhookReceived = null;
let failedDbChecks = 0;

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: { status: 'unknown' },
      whatsapp: { status: 'ok' }
    }
  };

  // Check database connection if Supabase credentials are available
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    try {
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
      );
      
      // Simple query to check database connection
      const { data, error } = await supabase
        .from('whatsapp_messages')
        .select('id')
        .limit(1);
      
      if (error) {
        healthStatus.services.database = {
          status: 'error',
          message: error.message
        };
        healthStatus.status = 'degraded';
      } else {
        healthStatus.services.database = {
          status: 'ok'
        };
      }
    } catch (error) {
      healthStatus.services.database = {
        status: 'error',
        message: error.message
      };
      healthStatus.status = 'degraded';
    }
  } else {
    healthStatus.services.database = {
      status: 'not_configured'
    };
  }

  // Check WhatsApp API configuration
  if (!process.env.WHATSAPP_TOKEN || !process.env.WHATSAPP_PHONE_NUMBER_ID) {
    healthStatus.services.whatsapp = {
      status: 'not_configured'
    };
    healthStatus.status = 'degraded';
  }

  // Check webhook verification token
  if (!process.env.WEBHOOK_VERIFY_TOKEN) {
    healthStatus.services.webhook = {
      status: 'not_configured'
    };
    healthStatus.status = 'degraded';
  } else {
    healthStatus.services.webhook = {
      status: 'ok'
    };
  }

  // Check Facebook App Secret
  if (!process.env.FACEBOOK_APP_SECRET) {
    healthStatus.services.facebook = {
      status: 'not_configured'
    };
    healthStatus.status = 'degraded';
  } else {
    healthStatus.services.facebook = {
      status: 'ok'
    };
  }

  // Set cache headers to prevent caching
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  // Return health status
  return res.status(200).json(healthStatus);
}

// Function to be called from the webhook handler when a webhook is received
export function recordWebhookReceived() {
  lastWebhookReceived = new Date().toISOString();
}

// Increase Node.js memory limit for this endpoint
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}; 
  // Track last health check
  const now = new Date();
  const timestamp = now.toISOString();
  
  try {
    // Check Supabase connection
    const { error, data } = await supabase
      .from('system_status')
      .select('last_updated, status')
      .eq('service', 'webhook')
      .single();
    
    if (error) {
      failedDbChecks++;
      
      // Log the error
      logEvent('health_check_error', {
        error: error.message,
        failedDbChecks,
        timestamp,
      });
      
      return res.status(500).json({
        status: 'error',
        message: 'Database connection error',
        database_status: 'unavailable',
        webhook_status: lastWebhookReceived ? 'operational' : 'unknown',
        timestamp,
        error: error.message,
      });
    }
    
    // Reset the counter if successful
    failedDbChecks = 0;
    
    // Update the system status
    const { error: updateError } = await supabase
      .from('system_status')
      .upsert({
        service: 'webhook',
        status: 'operational',
        last_updated: timestamp,
        details: { lastHealthCheck: timestamp }
      });
    
    if (updateError) {
      console.warn('Failed to update system status:', updateError);
    }
    
    // Calculate time since last webhook
    let webhookStatus = 'unknown';
    let timeSinceLastWebhook = null;
    
    if (lastWebhookReceived) {
      const lastWebhookTime = new Date(lastWebhookReceived);
      timeSinceLastWebhook = Math.floor((now - lastWebhookTime) / 1000); // in seconds
      
      // Consider the webhook unhealthy if no events received in the last hour
      // This may need adjustment based on expected traffic
      webhookStatus = timeSinceLastWebhook < 3600 ? 'operational' : 'no_recent_events';
    }
    
    // Log the health check
    logEvent('health_check', {
      webhook_status: webhookStatus,
      database_status: 'available',
      last_webhook_received: lastWebhookReceived,
      time_since_last_webhook: timeSinceLastWebhook,
      timestamp,
    });
    
    // Return the health status
    return res.status(200).json({
      status: 'ok',
      database_status: 'available',
      webhook_status: webhookStatus,
      last_webhook_received: lastWebhookReceived,
      time_since_last_webhook: timeSinceLastWebhook,
      environment: process.env.NODE_ENV,
      timestamp,
    });
  } catch (error) {
    console.error('Health check error:', error);
    
    // Log the error
    logEvent('health_check_error', {
      error: error.message,
      stack: error.stack,
      timestamp,
    });
    
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message,
      timestamp,
    });
  }
}

// Function to be called from the webhook handler when a webhook is received
export function recordWebhookReceived() {
  lastWebhookReceived = new Date().toISOString();
}

// Increase Node.js memory limit for this endpoint
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}; 
    const { error, data } = await supabase
      .from('system_status')
      .select('last_updated, status')
      .eq('service', 'webhook')
      .single();
    
    if (error) {
      failedDbChecks++;
      
      // Log the error
      logEvent('health_check_error', {
        error: error.message,
        failedDbChecks,
        timestamp,
      });
      
      return res.status(500).json({
        status: 'error',
        message: 'Database connection error',
        database_status: 'unavailable',
        webhook_status: lastWebhookReceived ? 'operational' : 'unknown',
        timestamp,
        error: error.message,
      });
    }
    
    // Reset the counter if successful
    failedDbChecks = 0;
    
    // Update the system status
    const { error: updateError } = await supabase
      .from('system_status')
      .upsert({
        service: 'webhook',
        status: 'operational',
        last_updated: timestamp,
        details: { lastHealthCheck: timestamp }
      });
    
    if (updateError) {
      console.warn('Failed to update system status:', updateError);
    }
    
    // Calculate time since last webhook
    let webhookStatus = 'unknown';
    let timeSinceLastWebhook = null;
    
    if (lastWebhookReceived) {
      const lastWebhookTime = new Date(lastWebhookReceived);
      timeSinceLastWebhook = Math.floor((now - lastWebhookTime) / 1000); // in seconds
      
      // Consider the webhook unhealthy if no events received in the last hour
      // This may need adjustment based on expected traffic
      webhookStatus = timeSinceLastWebhook < 3600 ? 'operational' : 'no_recent_events';
    }
    
    // Log the health check
    logEvent('health_check', {
      webhook_status: webhookStatus,
      database_status: 'available',
      last_webhook_received: lastWebhookReceived,
      time_since_last_webhook: timeSinceLastWebhook,
      timestamp,
    });
    
    // Return the health status
    return res.status(200).json({
      status: 'ok',
      database_status: 'available',
      webhook_status: webhookStatus,
      last_webhook_received: lastWebhookReceived,
      time_since_last_webhook: timeSinceLastWebhook,
      environment: process.env.NODE_ENV,
      timestamp,
    });
  } catch (error) {
    console.error('Health check error:', error);
    
    // Log the error
    logEvent('health_check_error', {
      error: error.message,
      stack: error.stack,
      timestamp,
    });
    
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      error: error.message,
      timestamp,
    });
  }
}

// Function to be called from the webhook handler when a webhook is received
export function recordWebhookReceived() {
  lastWebhookReceived = new Date().toISOString();
}

// Increase Node.js memory limit for this endpoint
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '1mb',
    },
  },
}; 