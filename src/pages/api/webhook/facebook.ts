import { NextApiRequest, NextApiResponse } from 'next';
import { FacebookWebhookHandler } from '../../../webhook/handlers/facebookHandler';

const handler = new FacebookWebhookHandler();

export default async function facebookWebhook(req: NextApiRequest, res: NextApiResponse) {
  await handler.handle(req, res);
} 