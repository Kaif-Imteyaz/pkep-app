import type { NextApiRequest, NextApiResponse } from 'next';
import { WhatsAppWebhookHandler } from '../../src/webhook/handlers/whatsappHandler';

const whatsappHandler = new WhatsAppWebhookHandler();

export default async function webhook(req: NextApiRequest, res: NextApiResponse) {
  try {
    await whatsappHandler.handle(req, res);
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 