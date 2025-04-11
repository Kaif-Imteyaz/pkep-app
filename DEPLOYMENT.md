# PKEP Deployment Guide

This guide provides step-by-step instructions for deploying the PKEP project on Vercel with WhatsApp webhook integration.

## Prerequisites

- A Vercel account
- A Meta Developer account with WhatsApp Business API access
- A Supabase account with project set up
- Git installed on your local machine

## Environment Variables

The following environment variables need to be set in your Vercel project:

```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
FACEBOOK_APP_SECRET=your_facebook_app_secret
WEBHOOK_VERIFY_TOKEN=your_custom_verification_token
WHATSAPP_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
```

These are already configured in the `vercel.json` file to be sourced from your Vercel environment.

## Deployment Steps

1. **Prepare your project**

   Ensure your project is committed to a Git repository (GitHub, GitLab, or Bitbucket).

2. **Connect to Vercel**

   ```bash
   # Install Vercel CLI if you haven't already
   npm install -g vercel
   
   # Login to Vercel
   vercel login
   
   # Link your project to Vercel
   cd PKEP
   vercel link
   ```

3. **Deploy to Vercel**

   ```bash
   # Deploy your project
   vercel --prod
   ```

   Alternatively, you can deploy directly from the Vercel dashboard by importing your Git repository.

4. **Set up WhatsApp webhook**

   After deployment, you'll get a deployment URL (e.g., `https://your-project.vercel.app`).
   
   - Go to your Meta Developer dashboard
   - Navigate to your WhatsApp app
   - Configure the webhook URL to point to `https://your-project.vercel.app/api/webhook`
   - Set the verification token to match your `WEBHOOK_VERIFY_TOKEN` environment variable
   - Subscribe to relevant WhatsApp events (messages, message_status_updates, etc.)

## Testing the Deployment

You can use the included test script to verify your webhook setup:

```bash
# Set the necessary environment variables
export WEBHOOK_URL=https://your-project.vercel.app/api/webhook
export VERIFY_TOKEN=your_webhook_verify_token
export APP_SECRET=your_facebook_app_secret
export TEST_PHONE=your_test_phone_number

# Run the test script
node test-webhook.js
```

## Troubleshooting

- **Webhook verification failing**: Ensure your `WEBHOOK_VERIFY_TOKEN` matches what you've configured in the Meta Developer dashboard.
- **Database connection errors**: Verify your Supabase credentials and ensure your IP is allowlisted if necessary.
- **Message handling issues**: Check the logs in your Vercel dashboard for detailed error information.

## Monitoring

- Use Vercel's built-in logging to monitor your application
- Set up alerts for deployment failures or function errors

## Updating the Deployment

To update your deployment after making changes:

```bash
# Deploy your updated project
vercel --prod
```

Or configure GitHub integration in Vercel for automatic deployments on push to your main branch. 
 

This guide provides step-by-step instructions for deploying the PKEP project on Vercel with WhatsApp webhook integration.

## Prerequisites

- A Vercel account
- A Meta Developer account with WhatsApp Business API access
- A Supabase account with project set up
- Git installed on your local machine

## Environment Variables

The following environment variables need to be set in your Vercel project:

```
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
FACEBOOK_APP_SECRET=your_facebook_app_secret
WEBHOOK_VERIFY_TOKEN=your_custom_verification_token
WHATSAPP_TOKEN=your_whatsapp_token
WHATSAPP_PHONE_NUMBER_ID=your_whatsapp_phone_number_id
```

These are already configured in the `vercel.json` file to be sourced from your Vercel environment.

## Deployment Steps

1. **Prepare your project**

   Ensure your project is committed to a Git repository (GitHub, GitLab, or Bitbucket).

2. **Connect to Vercel**

   ```bash
   # Install Vercel CLI if you haven't already
   npm install -g vercel
   
   # Login to Vercel
   vercel login
   
   # Link your project to Vercel
   cd PKEP
   vercel link
   ```

3. **Deploy to Vercel**

   ```bash
   # Deploy your project
   vercel --prod
   ```

   Alternatively, you can deploy directly from the Vercel dashboard by importing your Git repository.

4. **Set up WhatsApp webhook**

   After deployment, you'll get a deployment URL (e.g., `https://your-project.vercel.app`).
   
   - Go to your Meta Developer dashboard
   - Navigate to your WhatsApp app
   - Configure the webhook URL to point to `https://your-project.vercel.app/api/webhook`
   - Set the verification token to match your `WEBHOOK_VERIFY_TOKEN` environment variable
   - Subscribe to relevant WhatsApp events (messages, message_status_updates, etc.)

## Testing the Deployment

You can use the included test script to verify your webhook setup:

```bash
# Set the necessary environment variables
export WEBHOOK_URL=https://your-project.vercel.app/api/webhook
export VERIFY_TOKEN=your_webhook_verify_token
export APP_SECRET=your_facebook_app_secret
export TEST_PHONE=your_test_phone_number

# Run the test script
node test-webhook.js
```

## Troubleshooting

- **Webhook verification failing**: Ensure your `WEBHOOK_VERIFY_TOKEN` matches what you've configured in the Meta Developer dashboard.
- **Database connection errors**: Verify your Supabase credentials and ensure your IP is allowlisted if necessary.
- **Message handling issues**: Check the logs in your Vercel dashboard for detailed error information.

## Monitoring

- Use Vercel's built-in logging to monitor your application
- Set up alerts for deployment failures or function errors

## Updating the Deployment

To update your deployment after making changes:

```bash
# Deploy your updated project
vercel --prod
```

Or configure GitHub integration in Vercel for automatic deployments on push to your main branch. 
 