/**
 * Message handler utilities for PKEP WhatsApp Integration
 * Processes different types of incoming WhatsApp messages
 */

import { logInfo, logError, logWebhook } from './logger.js';
import { 
  sendTextMessage,
  sendMainMenu,
  sendKnowledgeSharingOptions,
  handleMeetingConfirmation,
  startReschedulingFlow,
  sendMeetingInformation,
  sendPerformanceSnapshot
} from '../lib/whatsapp.js';
import { 
  getOfficerByPhone,
  storeMessage,
  saveKnowledgeContribution,
  updateMessageStatus,
  getUserSession,
  setUserSession
} from '../lib/supabase.js';

// Session states
export const SESSION_STATES = {
  NONE: 'none',
  AWAITING_ROSE: 'awaiting_rose',
  AWAITING_THORN: 'awaiting_thorn',
  AWAITING_BUD: 'awaiting_bud',
  AWAITING_MEETING_CONFIRMATION: 'awaiting_meeting_confirmation',
  AWAITING_RESCHEDULE_REASON: 'awaiting_reschedule_reason'
};

// Message types
export const MESSAGE_TYPES = {
  TEXT: 'text',
  INTERACTIVE: 'interactive',
  BUTTON: 'button',
  MEDIA: 'media'
};

/**
 * Main message handler function
 * Routes message to appropriate handler based on type
 * 
 * @param {Object} message - The incoming WhatsApp message
 * @param {string} senderPhone - Sender's phone number
 * @returns {Promise<Object>} Response object
 */
export async function handleMessage(message, senderPhone) {
  try {
    logWebhook('Received WhatsApp message', { message, senderPhone });
    
    // Store the incoming message
    await storeMessage({
      phone: senderPhone,
      direction: 'incoming',
      message_type: getMessageType(message),
      content: JSON.stringify(message),
      timestamp: new Date().toISOString()
    });
    
    // Get message type and dispatch to appropriate handler
    const messageType = getMessageType(message);
    
    switch (messageType) {
      case MESSAGE_TYPES.TEXT:
        return handleTextMessage(message, senderPhone);
      
      case MESSAGE_TYPES.INTERACTIVE:
        return handleInteractiveMessage(message, senderPhone);
      
      case MESSAGE_TYPES.BUTTON:
        return handleButtonMessage(message, senderPhone);
      
      case MESSAGE_TYPES.MEDIA:
        return handleMediaMessage(message, senderPhone);
      
      default:
        logError('Unknown message type', 'handleMessage', { messageType, message });
        return sendTextMessage(
          senderPhone,
          "I'm sorry, I couldn't process your message. Please try using the menu options."
        );
    }
  } catch (error) {
    logError('Error handling message', 'handleMessage', error);
    return { error: 'Failed to process message' };
  }
}

/**
 * Determine the type of incoming message
 * 
 * @param {Object} message - The incoming WhatsApp message
 * @returns {string} Message type
 */
function getMessageType(message) {
  if (message.text) return MESSAGE_TYPES.TEXT;
  if (message.interactive) return MESSAGE_TYPES.INTERACTIVE;
  if (message.button) return MESSAGE_TYPES.BUTTON;
  if (message.image || message.video || message.audio || message.document) return MESSAGE_TYPES.MEDIA;
  return 'unknown';
}

/**
 * Handle text messages from users
 * 
 * @param {Object} message - The text message
 * @param {string} senderPhone - Sender's phone number
 * @returns {Promise<Object>} Response object
 */
async function handleTextMessage(message, senderPhone) {
  try {
    const textContent = message.text.body.trim();
    
    // Check for special commands
    if (textContent.toLowerCase() === 'menu') {
      return sendMainMenu(senderPhone);
    }
    
    if (textContent.toLowerCase() === 'help') {
      return sendTextMessage(
        senderPhone,
        "Welcome to PKEP! You can type 'menu' to see available options or use the buttons in the messages I send you."
      );
    }
    
    // Handle session-based inputs
    const session = await getUserSession(senderPhone);
    
    if (session) {
      switch (session.state) {
        case SESSION_STATES.AWAITING_ROSE:
          await saveKnowledgeContribution({
            phone: senderPhone,
            type: 'rose',
            content: textContent,
            timestamp: new Date().toISOString()
          });
          
          await setUserSession(senderPhone, SESSION_STATES.AWAITING_THORN);
          return sendTextMessage(
            senderPhone,
            "Thank you for sharing your Rose! Now, please share a Thorn: something that didn't go well or a challenge you faced."
          );
        
        case SESSION_STATES.AWAITING_THORN:
          await saveKnowledgeContribution({
            phone: senderPhone,
            type: 'thorn',
            content: textContent,
            timestamp: new Date().toISOString()
          });
          
          await setUserSession(senderPhone, SESSION_STATES.AWAITING_BUD);
          return sendTextMessage(
            senderPhone,
            "Thank you for sharing your Thorn! Now, please share a Bud: an idea or opportunity you see for the future."
          );
        
        case SESSION_STATES.AWAITING_BUD:
          await saveKnowledgeContribution({
            phone: senderPhone,
            type: 'bud',
            content: textContent,
            timestamp: new Date().toISOString()
          });
          
          // Reset session
          await setUserSession(senderPhone, SESSION_STATES.NONE);
          return sendTextMessage(
            senderPhone,
            "Thank you for sharing your Bud! Your knowledge contribution has been recorded. Type 'menu' to see more options."
          );
        
        case SESSION_STATES.AWAITING_RESCHEDULE_REASON:
          // Store the reschedule reason
          // Here you would typically update a meeting record with the reason
          
          // Reset session
          await setUserSession(senderPhone, SESSION_STATES.NONE);
          return sendTextMessage(
            senderPhone,
            "Thank you for providing your reason. Your meeting will be rescheduled and you'll receive a confirmation soon."
          );
        
        default:
          // No specific session state or unhandled state
          break;
      }
    }
    
    // Default response for text without active session
    return sendMainMenu(senderPhone, 
      "I'm not sure how to respond to that text message. Here are some options:"
    );
  } catch (error) {
    logError('Error handling text message', 'handleTextMessage', error);
    return { error: 'Failed to process text message' };
  }
}

/**
 * Handle interactive messages (list selections, button clicks)
 * 
 * @param {Object} message - The interactive message
 * @param {string} senderPhone - Sender's phone number
 * @returns {Promise<Object>} Response object
 */
async function handleInteractiveMessage(message, senderPhone) {
  try {
    const interactive = message.interactive;
    
    // Handle list replies
    if (interactive.list_reply) {
      const id = interactive.list_reply.id;
      
      switch (id) {
        case 'share_knowledge':
          await setUserSession(senderPhone, SESSION_STATES.AWAITING_ROSE);
          return sendTextMessage(
            senderPhone,
            "Let's start with your Rose: please share something that went well in your work recently."
          );
        
        case 'view_meetings':
          return sendMeetingInformation(senderPhone);
        
        case 'view_performance':
          return sendPerformanceSnapshot(senderPhone);
        
        default:
          logInfo(`Unhandled list selection: ${id}`, 'handleInteractiveMessage');
          return sendMainMenu(senderPhone);
      }
    }
    
    // Handle button replies
    if (interactive.button_reply) {
      const id = interactive.button_reply.id;
      
      switch (id) {
        case 'confirm_meeting':
          return handleMeetingConfirmation(senderPhone, true);
        
        case 'reschedule_meeting':
          await setUserSession(senderPhone, SESSION_STATES.AWAITING_RESCHEDULE_REASON);
          return sendTextMessage(
            senderPhone,
            "Please provide a brief reason why you need to reschedule the meeting."
          );
        
        case 'view_knowledge_options':
          return sendKnowledgeSharingOptions(senderPhone);
        
        default:
          logInfo(`Unhandled button selection: ${id}`, 'handleInteractiveMessage');
          return sendMainMenu(senderPhone);
      }
    }
    
    return sendMainMenu(senderPhone);
  } catch (error) {
    logError('Error handling interactive message', 'handleInteractiveMessage', error);
    return { error: 'Failed to process interactive message' };
  }
}

/**
 * Handle button message responses
 * 
 * @param {Object} message - The button message
 * @param {string} senderPhone - Sender's phone number
 * @returns {Promise<Object>} Response object
 */
async function handleButtonMessage(message, senderPhone) {
  try {
    // Button messages are typically handled similar to interactive messages
    // This is a placeholder in case button messages have a specific format
    logInfo('Received button message', 'handleButtonMessage', message);
    return handleInteractiveMessage(message, senderPhone);
  } catch (error) {
    logError('Error handling button message', 'handleButtonMessage', error);
    return { error: 'Failed to process button message' };
  }
}

/**
 * Handle media messages (images, videos, etc.)
 * 
 * @param {Object} message - The media message
 * @param {string} senderPhone - Sender's phone number
 * @returns {Promise<Object>} Response object
 */
async function handleMediaMessage(message, senderPhone) {
  try {
    logInfo('Received media message', 'handleMediaMessage', message);
    
    // Determine media type
    let mediaType = 'unknown';
    if (message.image) mediaType = 'image';
    if (message.video) mediaType = 'video';
    if (message.audio) mediaType = 'audio';
    if (message.document) mediaType = 'document';
    
    // Acknowledge receipt of media
    return sendTextMessage(
      senderPhone,
      `Thank you for sending a ${mediaType}. While I can see it, I currently can't process media content. Please use text or menu options.`
    );
  } catch (error) {
    logError('Error handling media message', 'handleMediaMessage', error);
    return { error: 'Failed to process media message' };
  }
} 