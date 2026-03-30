export type Message = {
  created_at: string;
  telegram_chat_id: number | string;
  text: string | null;
  username: string | null;
  first_name?: string | null;
  last_name?: string | null;
  sent_at?: string | null;
};

export type MessagesResult = {
  errorMessage: string | null;
  messages: Message[];
};

export type TelegramMessageRow = {
  chat_id?: number | string | null;
  created_at: string;
  message_text?: string | null;
  telegram_chat_id?: number | string | null;
  text?: string | null;
  username: string | null;
  first_name?: string | null;
  last_name?: string | null;
  sent_at?: string | null;
};

export type DialogViewModel = {
  telegram_chat_id: Message["telegram_chat_id"];
  displayName: string;
  lastMessageAt: string;
  lastMessageText: string | null;
  messageCount: number;
  messages: Message[];
};
