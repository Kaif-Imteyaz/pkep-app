export interface WebhookConfig {
  isPublic: boolean;
  allowedOrigins: string[];
  rateLimit: {
    windowMs: number;
    max: number;
  };
}

export const webhookConfig: WebhookConfig = {
  isPublic: false, // Set to true only for development
  allowedOrigins: [
    'https://facebook.com',
    'https://*.facebook.com',
    'https://*.messenger.com'
  ],
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
  }
}; 