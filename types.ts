// Message types
export interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  imageUrl?: string;
  files?: string[];
}

// Reminder types
export interface Reminder {
  id: string;
  task: string;
  datetime: Date;
  status: 'pending' | 'sent' | 'failed';
  email?: string;
}

// Conversation Memory types (for embeddings/fine-tuning)
export interface ConversationMemory {
  id: string;
  userMessage: string;
  botResponse: string;
  timestamp: Date;
  embedding?: number[];
}