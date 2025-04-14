import crypto from 'crypto';
import { NextApiRequest, NextApiResponse } from 'next';
import { logEvent } from '../../utils/monitoring';
import { webhookConfig } from '../config';

export abstract class BaseWebhookHandler {
  protected readonly FACEBOOK_APP_SECRET: string;
  protected readonly WEBHOOK_VERIFY_TOKEN: string;
  private readonly rateLimitMap: Map<string, { count: number; resetTime: number }>;

  constructor() {
    this.FACEBOOK_APP_SECRET = process.env.FACEBOOK_APP_SECRET || '';
    this.WEBHOOK_VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN || '';
    this.rateLimitMap = new Map();
  }

  protected verifyWebhookSignature(req: NextApiRequest): boolean {
    if (!this.FACEBOOK_APP_SECRET) {
      console.warn("FACEBOOK_APP_SECRET not configured. Skipping signature verification.");
      return true;
    }

    const signature = req.headers["x-hub-signature-256"] || "";
    const body = req.body;

    if (!signature) {
      console.error("No signature found in headers");
      return false;
    }

    const expectedSignature = crypto
      .createHmac("sha256", this.FACEBOOK_APP_SECRET)
      .update(JSON.stringify(body))
      .digest("hex");

    return signature === `sha256=${expectedSignature}`;
  }

  protected checkRateLimit(ip: string): boolean {
    const now = Date.now();
    const limit = this.rateLimitMap.get(ip);

    if (!limit) {
      this.rateLimitMap.set(ip, { count: 1, resetTime: now + webhookConfig.rateLimit.windowMs });
      return true;
    }

    if (now > limit.resetTime) {
      this.rateLimitMap.set(ip, { count: 1, resetTime: now + webhookConfig.rateLimit.windowMs });
      return true;
    }

    if (limit.count >= webhookConfig.rateLimit.max) {
      return false;
    }

    limit.count++;
    return true;
  }

  protected validateOrigin(req: NextApiRequest): boolean {
    if (webhookConfig.isPublic) return true;
    
    const origin = req.headers.origin;
    if (!origin) return false;

    return webhookConfig.allowedOrigins.some(allowedOrigin => {
      const pattern = allowedOrigin.replace('*', '.*');
      return new RegExp(`^${pattern}$`).test(origin);
    });
  }

  protected setCorsHeaders(res: NextApiResponse): void {
    res.setHeader('Access-Control-Allow-Origin', webhookConfig.isPublic ? '*' : webhookConfig.allowedOrigins.join(', '));
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-hub-signature-256');
  }

  protected logRequest(req: NextApiRequest): void {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    logEvent("WEBHOOK_REQUEST", {
      method: req.method,
      path: req.url,
      ip,
      headers: req.headers,
      timestamp: new Date().toISOString()
    });
  }

  protected handleError(error: Error, res: NextApiResponse): void {
    console.error("Webhook error:", error);
    logEvent("WEBHOOK_ERROR", {
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    });
    res.status(500).send("Internal Server Error");
  }

  abstract handle(req: NextApiRequest, res: NextApiResponse): Promise<void>;
} 