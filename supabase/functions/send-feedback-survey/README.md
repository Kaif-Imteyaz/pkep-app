# WhatsApp Feedback Survey Template

This is a Supabase Edge Function for sending WhatsApp feedback survey messages using the WhatsApp Business API. The template is designed to match the one shown in the provided image, with a header, body text with parameters, and a button to fill out the survey.

## Preview

Open the `template-preview.html` file in your browser to see a visual representation of how the template should appear in WhatsApp.

## Prerequisites

To test this function, you need:

1. A WhatsApp Business API account
2. A registered and approved WhatsApp template named `feedback_survey` with the structure shown in the preview
3. Deno installed on your system (for local testing)
4. API credentials (API key, Phone ID)

## Template Structure

The feedback survey template has the following structure:

- **Header**: "How did we do?"
- **Body**: Text with parameters for business name, location, and date
- **Button**: "Fill out survey" with a URL link to the survey

## Template Registration

Before testing, you need to register the template with WhatsApp Business API:

1. Go to your Meta Business account
2. Navigate to the WhatsApp Business API section
3. Click on "Message Templates"
4. Create a new template with the name `feedback_survey`
5. Add the components as shown in the preview HTML file
6. Submit for approval (can take 24-48 hours)

## Testing Locally

### 1. Update Environment Variables

Edit either `run-test.sh` (Linux/Mac) or `run-test.ps1` (Windows) and replace the placeholder values with your actual credentials:

```bash
WHATSAPP_API_KEY="your_actual_api_key"
WHATSAPP_PHONE_ID="your_actual_phone_id"
SUPABASE_URL="your_supabase_url"
SUPABASE_SERVICE_ROLE_KEY="your_supabase_service_role_key"
```

### 2. Update Test Data (Optional)

In `test.ts`, you can modify the test data if needed:

```typescript
const testData = {
  phone: "+916239521161", // The test phone number
  businessName: "Jasper's Market",
  location: "123 Baker Street, Palo Alto CA, 91041",
  visitDate: "Jan 1, 2024",
  surveyLink: "https://forms.example.com/feedback?id=123",
  userId: "test-user-id"
};
```

### 3. Run the Test

#### On Linux/Mac:
```bash
chmod +x run-test.sh
./run-test.sh
```

#### On Windows:
```powershell
.\run-test.ps1
```

The test script will:
1. Start the Deno server locally
2. Send a test request with the provided data
3. Log the response from the WhatsApp API

## Deploying to Supabase

To deploy this function to Supabase:

1. Make sure you have the Supabase CLI installed
2. Navigate to your project root directory
3. Run the following command:

```bash
supabase functions deploy send-feedback-survey
```

## Calling the Function

Once deployed, you can call the function with a POST request:

```bash
curl -X POST https://your-supabase-project.functions.supabase.co/send-feedback-survey \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{
    "phone": "+916239521161",
    "businessName": "Jasper'\''s Market",
    "location": "123 Baker Street, Palo Alto CA, 91041",
    "visitDate": "Jan 1, 2024",
    "surveyLink": "https://forms.example.com/feedback?id=123",
    "userId": "test-user-id"
  }'
```

## Troubleshooting

If you encounter errors, check the following:

1. **Template Approval**: Make sure your template is approved by WhatsApp
2. **API Credentials**: Verify that your API key and phone ID are correct
3. **Phone Number Format**: Ensure the test phone number is properly formatted
4. **Template Structure**: Confirm that your approved template structure matches the one in the code
5. **Rate Limits**: Be aware of WhatsApp API rate limits for testing

## About the Test Phone Number

The test phone number `+916239521161` should be properly registered and opted in to receive WhatsApp messages from your business account before testing. 