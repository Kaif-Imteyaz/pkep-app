import axios, { AxiosResponse } from 'axios';

interface WhatsAppResponse {
  messages?: { id?: string }[];
}

interface TemplatePayload {
  messaging_product: 'whatsapp';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: {
      code: string;
    };
    components?: any[]; // Define more specific type if needed
  };
}

interface TextPayload {
  messaging_product: 'whatsapp';
  to: string;
  type: 'text';
  text: {
    body: string;
  };
}

// Reusable function to send WhatsApp messages using Axios
async function sendMessage<T extends TemplatePayload | TextPayload>(
  apiUrl: string,
  payload: T,
  accessToken: string
): Promise<AxiosResponse<WhatsAppResponse>> {
  try {
    const response: AxiosResponse<WhatsAppResponse> = await axios.post(apiUrl, payload, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });
    return response;
  } catch (error: any) {
    console.error('Error sending message:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      console.error('Request:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
    throw error; // Re-throw the error to be handled by the caller
  }
}

// --- Functions to send specific message types using the sendMessage function ---

export async function sendWhatsAppTemplate(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  templateName: string,
  languageCode: string = 'en_US',
  components: any[] = []
): Promise<WhatsAppResponse> {
  const apiUrl = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;
  const payload: TemplatePayload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: {
        code: languageCode,
      },
      components,
    },
  };
  const response = await sendMessage(apiUrl, payload, accessToken);
  return response.data;
}

export async function sendWhatsAppTextMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string
): Promise<WhatsAppResponse> {
  const apiUrl = `https://graph.facebook.com/v22.0/${phoneNumberId}/messages`;
  const payload: TextPayload = {
    messaging_product: 'whatsapp',
    to,
    type: 'text',
    text: {
      body: text,
    },
  };
  const response = await sendMessage(apiUrl, payload, accessToken);
  return response.data;
}

// Example usage (assuming you have phoneNumberId and accessToken defined elsewhere)
// async function exampleUsage() {
//   const phoneNumberId = 'YOUR_PHONE_NUMBER_ID';
//   const accessToken = 'YOUR_ACCESS_TOKEN';
//   const recipientNumber = '919956875787';

//   try {
//     const templateResponse = await sendWhatsAppTemplate(
//       phoneNumberId,
//       accessToken,
//       recipientNumber,
//       'hello_world'
//     );
//     console.log('Template Response:', templateResponse);

//     const textResponse = await sendWhatsAppTextMessage(
//       phoneNumberId,
//       accessToken,
//       recipientNumber,
//       'Hello from the function!'
//     );
//     console.log('Text Response:', textResponse);
//   } catch (error) {
//     console.error('Error in example usage:', error);
//   }
// }

// exampleUsage();