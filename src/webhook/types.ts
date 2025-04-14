export interface WebhookMessage {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: {
    body: string;
  };
  interactive?: {
    type: string;
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
    };
  };
}

export interface WebhookSession {
  id: string;
  user_id: string;
  phone_number: string;
  session_data: {
    state: string;
  };
  updated_at: string;
} 