import axios from 'axios';
import { storeMessage } from './supabase';
import { executeWithRetry, logError } from '../utils/errorHandling';

// WhatsApp API Configuration
const WHATSAPP_API_VERSION = process.env.WHATSAPP_API_VERSION || 'v17.0';
const WHATSAPP_PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WHATSAPP_ACCESS_TOKEN = process.env.WHATSAPP_TOKEN;

// Store outgoing message in the database
async function storeOutgoingMessage(messageId, userId, to, content, type) {
  try {
    return await storeMessage(messageId, userId, to, content, 'outgoing', type);
  } catch (error) {
    logError(error, { function: 'storeOutgoingMessage', to, type });
    // Continue even if storing fails - don't let DB issues block message sending
    return null;
  }
}

// Send a template message
export async function sendTemplate(to, userId, templateName, language, components = []) {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: language || 'en'
      },
      components
    }
  };

  return executeWithRetry(
    async () => {
      const response = await axios.post(
        `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const messageId = response.data.messages?.[0]?.id;
      if (messageId) {
        await storeOutgoingMessage(
          messageId, 
          userId, 
          to, 
          JSON.stringify(payload), 
          'template'
        );
      }

      return response.data;
    },
    {
      maxRetries: 3,
      onRetry: ({ attempt, delay }) => {
        console.log(`Retrying sendTemplate (attempt ${attempt}) in ${delay}ms`);
      }
    }
  );
}

// Send a simple text message
export async function sendTextMessage(to, userId, text) {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'text',
    text: {
      body: text
    }
  };

  return executeWithRetry(
    async () => {
      const response = await axios.post(
        `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const messageId = response.data.messages?.[0]?.id;
      if (messageId) {
        await storeOutgoingMessage(
          messageId, 
          userId, 
          to, 
          text, 
          'text'
        );
      }

      return response.data;
    },
    {
      maxRetries: 3,
      onRetry: ({ attempt, delay }) => {
        console.log(`Retrying sendTextMessage (attempt ${attempt}) in ${delay}ms`);
      }
    }
  );
}

// Send button message
export async function sendButtonMessage(to, userId, text, buttons) {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: {
        text
      },
      action: {
        buttons
      }
    }
  };

  return executeWithRetry(
    async () => {
      const response = await axios.post(
        `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const messageId = response.data.messages?.[0]?.id;
      if (messageId) {
        await storeOutgoingMessage(
          messageId, 
          userId, 
          to, 
          JSON.stringify(payload), 
          'interactive'
        );
      }

      return response.data;
    },
    {
      maxRetries: 3,
      onRetry: ({ attempt, delay }) => {
        console.log(`Retrying sendButtonMessage (attempt ${attempt}) in ${delay}ms`);
      }
    }
  );
}

// Send list message
export async function sendListMessage(to, userId, text, buttonText, sections) {
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'interactive',
    interactive: {
      type: 'list',
      body: {
        text
      },
      action: {
        button: buttonText,
        sections
      }
    }
  };

  return executeWithRetry(
    async () => {
      const response = await axios.post(
        `https://graph.facebook.com/${WHATSAPP_API_VERSION}/${WHATSAPP_PHONE_NUMBER_ID}/messages`,
        payload,
        {
          headers: {
            Authorization: `Bearer ${WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const messageId = response.data.messages?.[0]?.id;
      if (messageId) {
        await storeOutgoingMessage(
          messageId, 
          userId, 
          to, 
          JSON.stringify(payload), 
          'interactive'
        );
      }

      return response.data;
    },
    {
      maxRetries: 3,
      onRetry: ({ attempt, delay }) => {
        console.log(`Retrying sendListMessage (attempt ${attempt}) in ${delay}ms`);
      }
    }
  );
}

// Send main menu options
export async function sendMainMenu(to, userId) {
  const buttons = [
    {
      type: 'reply',
      reply: {
        id: 'KNOWLEDGE_SHARING',
        title: 'Knowledge Sharing'
      }
    },
    {
      type: 'reply',
      reply: {
        id: 'MEETINGS',
        title: 'Meetings'
      }
    },
    {
      type: 'reply',
      reply: {
        id: 'PERFORMANCE',
        title: 'Performance'
      }
    }
  ];

  return sendButtonMessage(
    to,
    userId,
    'Welcome to PKEP. What would you like to do today?',
    buttons
  );
}

// Send knowledge sharing options
export async function sendKnowledgeSharingOptions(to, userId) {
  const buttons = [
    {
      type: 'reply',
      reply: {
        id: 'SHARE_KNOWLEDGE',
        title: 'Share Knowledge'
      }
    },
    {
      type: 'reply',
      reply: {
        id: 'VIEW_KNOWLEDGE',
        title: 'View Knowledge'
      }
    },
    {
      type: 'reply',
      reply: {
        id: 'BEST_PRACTICES',
        title: 'Best Practices'
      }
    }
  ];

  return sendButtonMessage(
    to,
    userId,
    'Knowledge Sharing Options:\n\nShare your experiences using #rose (positive practice), #thorn (challenge), or #bud (new idea).',
    buttons
  );
}

// Send meeting information
export async function sendMeetingInformation(to, userId) {
  // This would fetch meeting information from the database
  return sendTextMessage(
    to,
    userId,
    "Your upcoming meetings will be displayed here. We're working on this feature."
  );
}

// Send performance snapshot
export async function sendPerformanceSnapshot(to, userId) {
  // This would fetch performance data from the database
  return sendTextMessage(
    to,
    userId,
    "Your performance metrics will be displayed here. We're working on this feature."
  );
}

// Handle meeting confirmation
export async function handleMeetingConfirmation(to, userId, meetingId) {
  // Update meeting status in database
  return sendTextMessage(
    to,
    userId,
    "Your meeting has been confirmed. You'll receive a reminder closer to the time."
  );
}

// Start rescheduling flow
export async function startReschedulingFlow(to, userId, meetingId) {
  return sendTextMessage(
    to,
    userId,
    "Please suggest alternative date and time for your meeting. Format: DD/MM/YYYY HH:MM"
  );
}

/**
 * Format phone number to ensure proper format for WhatsApp API
 * Removes spaces, dashes, etc. and ensures country code is present
 * 
 * @param {string} phone - Phone number to format
 * @returns {string} Formatted phone number
 */
function formatPhoneNumber(phone) {
  if (!phone) return null;
  
  // Remove non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Ensure country code is present (assuming India +91 if not)
  if (digits.length === 10) {
    return `91${digits}`;  // Add India country code
  } else if (digits.startsWith('91') && digits.length === 12) {
    return digits;  // Already has India country code
  } else if (digits.startsWith('0')) {
    return `91${digits.substring(1)}`; // Replace leading 0 with country code
  } else if (digits.startsWith('+')) {
    return digits.substring(1); // Remove leading +
  }
  
  // Return as is if none of the above apply
  return digits;
} 