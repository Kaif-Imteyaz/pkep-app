# PowerShell script to run the test

# Set environment variables
$env:WHATSAPP_API_KEY = "YOUR_WHATSAPP_API_KEY"
$env:WHATSAPP_PHONE_ID = "YOUR_WHATSAPP_PHONE_ID"
$env:SUPABASE_URL = "YOUR_SUPABASE_URL"
$env:SUPABASE_SERVICE_ROLE_KEY = "YOUR_SUPABASE_SERVICE_ROLE_KEY"

# Run the test
deno run --allow-net --allow-env --allow-read test.ts 