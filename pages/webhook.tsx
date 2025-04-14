import React, { useEffect, useState } from 'react';

export default function WebhookPage() {
  const [status, setStatus] = useState<string>('Checking webhook status...');
  const [messages, setMessages] = useState<string[]>([]);

  useEffect(() => {
    // Function to verify webhook
    const verifyWebhook = async () => {
      try {
        // Test webhook verification
        const verifyResponse = await fetch('/api/webhook?hub.mode=subscribe&hub.verify_token=your_verify_token&hub.challenge=test123');
        const verifyData = await verifyResponse.text();
        
        if (verifyResponse.ok) {
          setStatus('✅ Webhook verified successfully');
          addMessage(`Webhook verification successful. Challenge: ${verifyData}`);
        } else {
          setStatus('❌ Webhook verification failed');
          addMessage(`Webhook verification failed: ${verifyData}`);
        }

        // Test webhook message
        const messageResponse = await fetch('/api/webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            object: 'whatsapp_business_account',
            entry: [{
              id: 'test_account',
              changes: [{
                value: {
                  messages: [{
                    from: process.env.TEST_PHONE || '+1234567890',
                    id: 'test_message',
                    text: { body: 'Test message' },
                    type: 'text',
                    timestamp: Date.now().toString()
                  }]
                }
              }]
            }]
          })
        });

        const messageData = await messageResponse.text();
        addMessage(`Test message response: ${messageData}`);

      } catch (error) {
        setStatus('❌ Error testing webhook');
        addMessage(`Error: ${error.message}`);
      }
    };

    verifyWebhook();
  }, []);

  const addMessage = (message: string) => {
    setMessages(prev => [...prev, `[${new Date().toISOString()}] ${message}`]);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Webhook Status</h1>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-2">Current Status</h2>
          <p className="text-lg">{status}</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4">Webhook Messages</h2>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
            {messages.map((message, index) => (
              <div key={index} className="mb-2">{message}</div>
            ))}
            {messages.length === 0 && (
              <div className="text-gray-500">No messages yet...</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 