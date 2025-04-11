#!/bin/bash

# Run the test with environment variables
WHATSAPP_API_KEY="YOUR_WHATSAPP_API_KEY" \
WHATSAPP_PHONE_ID="YOUR_WHATSAPP_PHONE_ID" \
SUPABASE_URL="YOUR_SUPABASE_URL" \
SUPABASE_SERVICE_ROLE_KEY="YOUR_SUPABASE_SERVICE_ROLE_KEY" \
deno run --allow-net --allow-env --allow-read test.ts 