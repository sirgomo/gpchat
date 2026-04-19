export interface iMessage {
  model: string;
  temperature?: number;
  messages: iMessageContent[];
  max_tokens?: number | null;
  stream?: boolean;
}

export interface iMessageContent {
  role: 'system' | 'user' | 'assistant';
  content: string;
  image_url?: { url: string } | { url: string }[];
}

export interface iConversation {
  id: string;
  name: string;
  messages: iMessageContent[];
  systemPrompt?: string;
  createdAt: number;
  updatedAt: number;
}

export interface iThread {
  id: string;
  messages: { role: string; content: string }[];
}