export type ActionResult = {
  error: string | null;
  success: string | null;
};

export type ManagerSummary = {
  auth_user_id: string;
  company_role: string | null;
  email: string | null;
  first_name: string | null;
  id: number;
  last_name: string | null;
};

export type Message = {
  client_id: number;
  created_at: string;
  direction: string | null;
  manager_id: number | null;
  telegram_chat_id: number | string;
  text: string | null;
  username: string | null;
  first_name?: string | null;
  last_name?: string | null;
  sent_at?: string | null;
};

export type MessageRow = {
  client_id: number;
  created_at: string;
  direction: string | null;
  manager_id: number | null;
  message_text: string | null;
  sent_at: string | null;
};

export type ActiveChatRow = {
  client_id: number;
  current_manager_id: number | null;
  first_name: string | null;
  incoming_messages: number;
  last_message_at: string | null;
  last_message_text: string | null;
  last_message_sent_at: string | null;
  last_name: string | null;
  manager_auth_user_id: string | null;
  manager_company_role: string | null;
  manager_first_name: string | null;
  manager_last_name: string | null;
  outgoing_messages: number;
  telegram_chat_id: number | string;
  telegram_user_id: number | string | null;
  total_messages: number;
  username: string | null;
};

export type MessageStatsRow = {
  active_chats_count: number;
  incoming_messages: number;
  outgoing_messages: number;
  total_messages: number;
  unassigned_clients_count: number;
};

export type DashboardStats = {
  activeChatsCount: number;
  incomingMessages: number;
  outgoingMessages: number;
  totalMessages: number;
  unassignedClientsCount: number;
};

export type DashboardDataResult = {
  currentUserId: string | null;
  dialogs: DialogViewModel[];
  errorMessage: string | null;
  managers: ManagerSummary[];
  stats: DashboardStats;
};

export type DialogViewModel = {
  client_id: number;
  current_manager_id: number | null;
  displayName: string;
  incomingMessages: number;
  lastMessageAt: string;
  lastMessageText: string | null;
  manager_auth_user_id: string | null;
  manager_company_role?: string | null;
  manager_first_name?: string | null;
  manager_last_name?: string | null;
  messageCount: number;
  messages: Message[];
  outgoingMessages: number;
  telegram_chat_id: Message["telegram_chat_id"];
};
