export type Message = {
  created_at: string;
  telegram_chat_id: number | string;
  text: string | null;
  username: string | null;
};
