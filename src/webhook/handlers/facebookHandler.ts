import type { NextApiRequest, NextApiResponse } from 'next';
import { BaseWebhookHandler } from './baseHandler';
import { logEvent } from '../../utils/monitoring';

export class FacebookWebhookHandler extends BaseWebhookHandler {
  async handle(req: NextApiRequest, res: NextApiResponse): Promise<void> {
    try {
      this.logRequest(req);
      this.setCorsHeaders(res);

      // Check rate limit
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      if (!this.checkRateLimit(ip as string)) {
        res.status(429).send("Too Many Requests");
        return;
      }

      // Validate origin
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

        const { object, entry } = req.body;

        if (object !== 'page') {
          console.error("Invalid webhook object type:", object);
          res.status(400).send("Invalid object type");
          return;
        }

        // Process each entry
        for (const pageEntry of entry) {
          const { id: pageId, time, messaging } = pageEntry;

          if (!messaging || !Array.isArray(messaging)) {
            console.log("No messaging events in this entry");
            continue;
          }

          for (const event of messaging) {
            await this.processMessagingEvent(event, pageId, time);
          }
        }

        res.status(200).send("EVENT_RECEIVED");
        return;
      }

      res.status(405).send("Method not allowed");
    } catch (error) {
      this.handleError(error as Error, res);
    }
  }

  private async processMessagingEvent(event: any, pageId: string, time: number): Promise<void> {
    try {
      const { sender, recipient, message, postback } = event;
      const senderId = sender.id;
      const recipientId = recipient.id;

      // Log the event for monitoring
      logEvent("FACEBOOK_WEBHOOK_EVENT", {
        pageId,
        senderId,
        recipientId,
        eventType: message ? "message" : "postback",
        timestamp: time,
        messageId: message?.mid,
        postbackPayload: postback?.payload
      });

      // Handle different types of events
      if (message) {
        await this.handleMessageEvent(message, senderId, pageId);
      } else if (postback) {
        await this.handlePostbackEvent(postback, senderId, pageId);
      }
    } catch (error) {
      console.error("Error processing messaging event:", error);
      logEvent("MESSAGING_EVENT_ERROR", {
        error: (error as Error).message,
        event: JSON.stringify(event)
      });
    }
  }

  private async handleMessageEvent(message: any, senderId: string, pageId: string): Promise<void> {
    // Implement message handling logic here
    console.log("Processing message event:", {
      senderId,
      pageId,
      message
    });
  }

  private async handlePostbackEvent(postback: any, senderId: string, pageId: string): Promise<void> {
    // Implement postback handling logic here
    console.log("Processing postback event:", {
      senderId,
      pageId,
      postback
    });
  }

  protected handleVerification(req: NextApiRequest, res: NextApiResponse): void {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === this.WEBHOOK_VERIFY_TOKEN) {
      res.status(200).send(challenge);
      return;
    }

    res.status(403).send('Forbidden');
  }
} 