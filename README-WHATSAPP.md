# PKEP WhatsApp Integration Guide

This document provides instructions for setting up and using the WhatsApp Integration for the Peer Knowledge Exchange Project (PKEP).

## Overview

The PKEP WhatsApp integration allows government officers to:

1. Share knowledge via WhatsApp using the "Buds, Thorns, Roses" framework
2. View and manage upcoming meetings with learning partners
3. Access performance snapshots
4. Interact with the platform using interactive menus

## Prerequisites

- Meta/Facebook Developer Account
- WhatsApp Business API access
- WhatsApp Business Phone Number
- Supabase account with the required database tables set up
- Node.js (v14+)
- A server or serverless platform for hosting the webhook (e.g., Vercel)

## Setup Steps

### 1. Set up Supabase Database

Make sure your Supabase database has the required tables and policies as defined in the `tables.md` file. You can run the migration in `supabase/migrations/20250108000001_add_whatsapp_integration.sql` to set up the necessary tables:

```bash
# Using the Supabase CLI
supabase db push
```

Alternatively, you can run the SQL directly in the Supabase SQL editor.

### 2. Environment Variables

Create a `.env` file in the root of your project with the following variables:

```
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE=your-service-role-key

# WhatsApp API Configuration
WHATSAPP_API_VERSION=v17.0
WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
WHATSAPP_ACCESS_TOKEN=your-whatsapp-access-token
FACEBOOK_APP_SECRET=your-app-secret

# Webhook Configuration
WEBHOOK_VERIFY_TOKEN=your-custom-verify-token
```

### 3. Set up WhatsApp Business API

1. Go to the [Meta Developer Portal](https://developers.facebook.com)
2. Create or select your app
3. Add the WhatsApp product to your app
4. Set up a WhatsApp Business account and add your phone number
5. Get your WhatsApp Phone Number ID and Access Token
6. Create message templates for the templates defined in `PKEP_WhatsApp_Templates.md`

### 4. Configure Webhook

1. Deploy your webhook endpoint to a publicly accessible URL (e.g., using Vercel)
2. In the Meta Developer Portal, go to WhatsApp > Configuration
3. Set up webhook with your URL: `https://your-domain.com/api/webhook`
4. Use the same verify token you set in your environment variables
5. Subscribe to the following webhook topics:
   - messages
   - message_status_updates

### 5. Supabase Edge Functions (Optional)

If you're using Supabase Edge Functions for additional functionality:

1. Deploy the send-verification function:
   ```bash
   supabase functions deploy send-verification --no-verify-jwt
   ```

2. Deploy the whatsapp-webhook function (if using Supabase for the main webhook):
   ```bash
   supabase functions deploy whatsapp-webhook --no-verify-jwt
   ```

3. Set up the necessary secrets in Supabase:
   ```bash
   supabase secrets set WHATSAPP_API_VERSION=v17.0
   supabase secrets set WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
   supabase secrets set WHATSAPP_ACCESS_TOKEN=your-whatsapp-access-token
   supabase secrets set FACEBOOK_APP_SECRET=your-app-secret
   supabase secrets set WEBHOOK_VERIFY_TOKEN=your-custom-verify-token
   ```

## Deployment Guide

### Deploying to Vercel

1. Push your code to a GitHub repository
2. Connect your repository to Vercel
3. Configure the following environment variables in your Vercel project settings:
   ```
   NEXT_PUBLIC_SUPABASE_URL
   NEXT_PUBLIC_SUPABASE_ANON_KEY
   SUPABASE_SERVICE_ROLE
   WHATSAPP_API_VERSION
   WHATSAPP_PHONE_NUMBER_ID
   WHATSAPP_ACCESS_TOKEN
   FACEBOOK_APP_SECRET
   WEBHOOK_VERIFY_TOKEN
   ```
4. Deploy your project
5. Use the provided Vercel URL as your webhook endpoint in the Meta Developer Portal

### Local Development

For local testing and development:

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Run the development server:
   ```bash
   vercel dev
   ```

3. Use a tool like ngrok to expose your local server to the internet:
   ```bash
   ngrok http 3000
   ```

4. Use the provided ngrok URL as your webhook endpoint in the Meta Developer Portal for testing

## Testing the Integration

You can test your WhatsApp webhook locally using the provided test script:

```bash
# Run the test script
node test-webhook.js
```

The test script will:
1. Test webhook verification
2. Test processing incoming text messages
3. Test processing interactive messages
4. Test status updates

For real WhatsApp messaging tests, you will need to use a number registered in your WhatsApp test account.

## Interacting with the System

### Sharing Knowledge

Users can share knowledge using the following formats:
- `#rose [positive practice]` - For sharing successes or positive practices
- `#thorn [challenge faced]` - For sharing challenges or problems
- `#bud [new idea]` - For sharing ideas or opportunities

Example:
```
#rose: We streamlined the land application process by creating clear checklists for applicants, reducing processing time by 40%.
```

### Interactive Menu

Users can also interact with a menu-based interface that provides the following options:
- Knowledge Sharing
- Meetings
- Performance

## Frontend Integration

The WhatsApp settings can be managed through the WhatsApp settings component in the frontend application. This allows users to:

1. Add and verify their WhatsApp number
2. Opt-in to WhatsApp communications
3. View their recent WhatsApp message history
4. Learn how to use the WhatsApp integration

## Troubleshooting

### Common Issues

- **Webhook Verification Failed**: Ensure your WEBHOOK_VERIFY_TOKEN matches between your environment and the Meta Developer Portal.
- **Cannot Find User**: Make sure phone numbers in the database include country codes and match the format from WhatsApp.
- **Database Errors**: Check that all required tables exist and have the correct schema.
- **Message Sending Fails**: Verify that your WHATSAPP_ACCESS_TOKEN is valid and has not expired.

## Security Considerations

- The webhook uses signature verification to ensure requests are from Meta
- Sensitive WhatsApp API credentials should be kept secure
- Database access is controlled via Row Level Security policies
- User sessions have expiration times to limit stale sessions

## Contributing

Follow these guidelines when contributing to the WhatsApp integration:

1. Maintain consistent error handling patterns
2. Add comprehensive logging for debugging
3. Keep database schema changes backward compatible
4. Test thoroughly before deploying changes

## License

This project is licensed under the MIT License - see the LICENSE file for details. 