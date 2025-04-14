import type { NextApiRequest, NextApiResponse } from 'next';
import { BaseWebhookHandler } from './baseHandler';
import { logEvent } from '../../utils/monitoring';
import * as whatsapp from '../../services/whatsapp';
import { WebhookMessage } from '../types';
import {
  supabaseAdmin,
  saveContribution,
  storeMessage,
  getOrCreateSession,
} from '../../lib/supabase';

// Mock function to simulate Meta API call
const mockMetaCall = async (operation: string, delay: number = 100): Promise<any> => {
  console.log(`[MOCK_META] Simulating ${operation}...`);
  await new Promise(resolve => setTimeout(resolve, delay));
  return { success: true };
};

export class WhatsAppWebhookHandler extends BaseWebhookHandler {
  private async measureMetaRequest(operation: string, requestFn: () => Promise<any>): Promise<any> {
    const startTime = performance.now();
    try {
      // Use mock function instead of actual Meta API call
      const result = await mockMetaCall(operation, Math.random() * 2000); // Random delay between 0-2 seconds
      const duration = performance.now() - startTime;
      
      console.log(`[META_API] ${operation} took ${duration.toFixed(2)}ms`);

      // Log warning if request takes too long
      if (duration > 5000) { // 5 seconds threshold
        console.warn(`[META_API_SLOW] ${operation} took ${duration.toFixed(2)}ms`);
      }

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`[META_API_ERROR] ${operation} failed after ${duration.toFixed(2)}ms:`, error);
      throw error;
    }
  }

  async handle(req: NextApiRequest, res: NextApiResponse): Promise<void> {
    const startTime = performance.now();
    try {
      this.logRequest(req);
      this.setCorsHeaders(res);

      // Rate limiting
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      if (!this.checkRateLimit(ip as string)) {
        res.status(429).send("Too Many Requests");
        return;
      }

      // Origin validation
      if (!this.validateOrigin(req)) {
        res.status(403).send("Invalid origin");
        return;
      }

      if (req.method === 'GET') {
        this.handleVerification(req, res);
        return;
      }

      if (req.method === 'POST') {
        if (!this.verifyWebhookSignature(req)) {
          console.error("Invalid webhook signature");
          res.status(401).send("Invalid signature");
          return;
        }

        // Mock webhook data for testing
        const mockData = {
          object: 'whatsapp_business_account',
          entry: [{
            id: 'test_account',
            changes: [{
              value: {
                messages: [{
                  from: '1234567890',
                  id: 'test_message',
                  text: { body: 'Test message' },
                  type: 'text',
                  timestamp: Date.now().toString()
                }],
                statuses: [] // Add empty statuses array
              }
            }]
          }]
        };

        const { object, entry } = mockData; // Use mock data instead of req.body

        if (object !== 'whatsapp_business_account') {
          console.error("Invalid webhook object type:", object);
          res.status(400).send("Invalid object type");
          return;
        }

        // Process each entry
        for (const messageEntry of entry) {
          const { id: accountId, changes } = messageEntry;

          for (const change of changes) {
            if (change.value.messages) {
              for (const message of change.value.messages) {
                await this.processMessage(message);
              }
            }

            if (change.value.statuses) {
              for (const status of change.value.statuses) {
                await this.processStatus(status);
              }
            }
          }
        }

        const duration = performance.now() - startTime;
        console.log(`[WEBHOOK] Request processed in ${duration.toFixed(2)}ms`);
        
        res.status(200).send("EVENT_RECEIVED");
        return;
      }

      res.status(405).send("Method not allowed");
    } catch (error) {
      const duration = performance.now() - startTime;
      console.error(`[WEBHOOK_ERROR] Request failed after ${duration.toFixed(2)}ms:`, error);
      this.handleError(error as Error, res);
    }
  }

  private async processMessage(message: WebhookMessage): Promise<void> {
    try {
      const { from, id: messageId, timestamp, type } = message;
      
      logEvent("WHATSAPP_MESSAGE", {
        from,
        messageId,
        type,
        timestamp
      });

      switch (type) {
        case 'text':
          await this.handleTextMessage(message);
          break;
        case 'interactive':
          await this.handleInteractiveMessage(message);
          break;
        default:
          console.log(`Unhandled message type: ${type}`);
      }
    } catch (error) {
      console.error("Error processing message:", error);
      logEvent("MESSAGE_PROCESSING_ERROR", {
        error: (error as Error).message,
        message
      });
    }
  }

  private async handleTextMessage(message: WebhookMessage): Promise<void> {
    try {
      const { from, id: messageId, text } = message;
      const userId = message.from;

      if (!text) {
        console.error("No text content in message");
        return;
      }

      // Store the message in the database
      await storeMessage(messageId, userId, from, text.body, "text");

      // Get or create the user's session
      const session = await getOrCreateSession(userId, from);

      if (!session) {
        console.error("Failed to get or create session");
        await this.measureMetaRequest("sendTextMessage", () => 
          whatsapp.sendTextMessage(
            from,
            userId,
            "We're experiencing technical difficulties. Please try again later."
          )
        );
        return;
      }

      // Check for special commands (Rose, Thorn, Bud format)
      const roseMatch = text.body.match(/^#rose\s*[:]*\s*(.*)/i);
      const thornMatch = text.body.match(/^#thorn\s*[:]*\s*(.*)/i);
      const budMatch = text.body.match(/^#bud\s*[:]*\s*(.*)/i);

      if (roseMatch && roseMatch[1]) {
        // Save as a Rose contribution
        const content = roseMatch[1].trim();
        const saved = await saveContribution(userId, "rose", content);

        if (saved) {
          await this.measureMetaRequest("sendTextMessage", () =>
            whatsapp.sendTextMessage(
              from,
              userId,
              "Thank you for sharing a positive practice! Your knowledge has been saved. Share more or use menu options to explore other features."
            )
          );
          return;
        }
      } else if (thornMatch && thornMatch[1]) {
        // Save as a Thorn contribution
        const content = thornMatch[1].trim();
        const saved = await saveContribution(userId, "thorn", content);

        if (saved) {
          await this.measureMetaRequest("sendTextMessage", () =>
            whatsapp.sendTextMessage(
              from,
              userId,
              "Thank you for sharing a challenge you faced. Your knowledge has been saved. Share more or use menu options to explore other features."
            )
          );
          return;
        }
      } else if (budMatch && budMatch[1]) {
        // Save as a Bud contribution
        const content = budMatch[1].trim();
        const saved = await saveContribution(userId, "bud", content);

        if (saved) {
          await this.measureMetaRequest("sendTextMessage", () =>
            whatsapp.sendTextMessage(
              from,
              userId,
              "Thank you for sharing your new idea! Your knowledge has been saved. Share more or use menu options to explore other features."
            )
          );
          return;
        }
      }

      // Handle session state-specific text responses
      if (session.session_data.state === "rescheduling") {
        await this.measureMetaRequest("sendTextMessage", () =>
          whatsapp.sendTextMessage(
            from,
            userId,
            "Thanks for your reschedule request. Your meeting coordinator will contact you to confirm the new time."
          )
        );
        return;
      }

      // Default response - send main menu
      await this.measureMetaRequest("sendMainMenu", () =>
        whatsapp.sendMainMenu(from, userId)
      );
    } catch (error) {
      console.error("Error handling text message:", error);
      await this.measureMetaRequest("sendTextMessage", () =>
        whatsapp.sendTextMessage(
          message.from,
          message.from,
          "We're experiencing technical difficulties. Please try again later."
        )
      );
    }
  }

  private async handleInteractiveMessage(message: WebhookMessage): Promise<void> {
    try {
      const { from, id: messageId, interactive } = message;
      const userId = message.from;

      if (!interactive) {
        console.error("No interactive content in message");
        return;
      }

      // Store the message in the database
      await storeMessage(
        messageId,
        userId,
        from,
        JSON.stringify(interactive),
        "interactive"
      );

      // Get or create the user's session
      const session = await getOrCreateSession(userId, from);

      if (!session) {
        console.error("Failed to get or create session");
        await this.measureMetaRequest("sendTextMessage", () =>
          whatsapp.sendTextMessage(
            from,
            userId,
            "We're experiencing technical difficulties. Please try again later."
          )
        );
        return;
      }

      if (interactive.type === "button_reply") {
        const buttonReply = interactive.button_reply;
        if (!buttonReply) {
          console.error("No button reply in interactive message");
          return;
        }

        // Process button selection
        switch (buttonReply.id) {
          case "KNOWLEDGE_SHARING":
            // Update session state
            await supabaseAdmin
              .from("whatsapp_sessions")
              .update({
                session_data: { state: "knowledge_sharing" },
                updated_at: new Date().toISOString(),
              })
              .eq("id", session.id);

            await this.measureMetaRequest("sendKnowledgeSharingOptions", () =>
              whatsapp.sendKnowledgeSharingOptions(from, userId)
            );
            break;

          case "MEETINGS":
            await supabaseAdmin
              .from("whatsapp_sessions")
              .update({
                session_data: { state: "meetings" },
                updated_at: new Date().toISOString(),
              })
              .eq("id", session.id);

            await this.measureMetaRequest("sendMeetingInformation", () =>
              whatsapp.sendMeetingInformation(from, userId)
            );
            break;

          case "PERFORMANCE":
            await supabaseAdmin
              .from("whatsapp_sessions")
              .update({
                session_data: { state: "performance" },
                updated_at: new Date().toISOString(),
              })
              .eq("id", session.id);

            await this.measureMetaRequest("sendPerformanceSnapshot", () =>
              whatsapp.sendPerformanceSnapshot(from, userId)
            );
            break;

          case "VIEW_KNOWLEDGE":
            await this.measureMetaRequest("sendTextMessage", () =>
              whatsapp.sendTextMessage(
                from,
                userId,
                "This feature is coming soon. You'll be able to browse knowledge shared by your peers."
              )
            );
            break;

          case "BEST_PRACTICES":
            await this.measureMetaRequest("sendTextMessage", () =>
              whatsapp.sendTextMessage(
                from,
                userId,
                "This feature is coming soon. You'll be able to see curated best practices from your peers."
              )
            );
            break;

          case "BACK_MAIN":
            await supabaseAdmin
              .from("whatsapp_sessions")
              .update({
                session_data: { state: "main_menu" },
                updated_at: new Date().toISOString(),
              })
              .eq("id", session.id);

            await this.measureMetaRequest("sendMainMenu", () =>
              whatsapp.sendMainMenu(from, userId)
            );
            break;

          default:
            await this.measureMetaRequest("sendMainMenu", () =>
              whatsapp.sendMainMenu(from, userId)
            );
        }
      } else if (interactive.type === "list_reply") {
        const listReply = interactive.list_reply;
        if (!listReply) {
          console.error("No list reply in interactive message");
          return;
        }
        await this.measureMetaRequest("sendTextMessage", () =>
          whatsapp.sendTextMessage(
            from,
            userId,
            `You selected: ${listReply.title}`
          )
        );
      } else {
        // Default fallback
        await this.measureMetaRequest("sendMainMenu", () =>
          whatsapp.sendMainMenu(from, userId)
        );
      }
    } catch (error) {
      console.error("Error handling interactive message:", error);
      await this.measureMetaRequest("sendTextMessage", () =>
        whatsapp.sendTextMessage(
          message.from,
          message.from,
          "We're experiencing technical difficulties. Please try again later."
        )
      );
    }
  }

  private async processStatus(status: { id: string; status: string; timestamp: string }): Promise<void> {
    try {
      const { id, status: statusType, timestamp } = status;
      
      logEvent("WHATSAPP_STATUS", {
        messageId: id,
        status: statusType,
        timestamp
      });

      // Update message status in database
      await whatsapp.updateMessageStatus(id, statusType);
    } catch (error) {
      console.error("Error processing status:", error);
      logEvent("STATUS_PROCESSING_ERROR", {
        error: (error as Error).message,
        status
      });
    }
  }

  protected handleVerification(req: NextApiRequest, res: NextApiResponse): void {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Log verification attempt
    console.log('Webhook verification attempt:', {
      mode,
      token,
      challenge,
      expectedToken: this.WEBHOOK_VERIFY_TOKEN
    });

    // Meta's verification format requires:
    // 1. Mode must be 'subscribe'
    // 2. Token must match WEBHOOK_VERIFY_TOKEN
    // 3. Challenge must be present
    if (mode === 'subscribe' && token === this.WEBHOOK_VERIFY_TOKEN && challenge) {
      // Set proper headers for Meta
      res.setHeader('Content-Type', 'text/plain');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // Return the challenge as plain text
      res.status(200).send(challenge);
      console.log('Webhook verified successfully');
      return;
    }

    // If verification fails, return 403
    console.error('Webhook verification failed:', {
      mode,
      token,
      challenge,
      expectedToken: this.WEBHOOK_VERIFY_TOKEN
    });
    res.status(403).send('Forbidden');
  }
} 