import type { ActiveChatRow, DialogViewModel, Message, MessageRow } from "@/types/message";

function getDisplayName(chat: Pick<ActiveChatRow, "first_name" | "last_name" | "username">): string {
  const username = chat.username?.trim();

  if (username) {
    return username;
  }

  const fullName = [chat.first_name?.trim(), chat.last_name?.trim()].filter(Boolean).join(" ");

  if (fullName) {
    return fullName;
  }

  return "Без username";
}

function getMessageTimestamp(message: Pick<Message, "created_at" | "sent_at">): string {
  return message.sent_at ?? message.created_at;
}

export function buildDialogs(activeChats: ActiveChatRow[], messageRows: MessageRow[]): DialogViewModel[] {
  const chatByClientId = new Map(activeChats.map((chat) => [chat.client_id, chat]));
  const messagesByClientId = new Map<number, Message[]>();

  for (const row of messageRows) {
    const chat = chatByClientId.get(row.client_id);

    if (!chat) {
      continue;
    }

    const message: Message = {
      client_id: row.client_id,
      created_at: row.created_at,
      direction: row.direction,
      first_name: chat.first_name,
      last_name: chat.last_name,
      manager_id: row.manager_id,
      sent_at: row.sent_at,
      telegram_chat_id: chat.telegram_chat_id,
      text: row.message_text,
      username: chat.username,
    };
    const clientMessages = messagesByClientId.get(row.client_id);

    if (clientMessages) {
      clientMessages.push(message);
      continue;
    }

    messagesByClientId.set(row.client_id, [message]);
  }

  return activeChats
    .map((chat): DialogViewModel => {
      const messages = [...(messagesByClientId.get(chat.client_id) ?? [])].sort(
        (left, right) =>
          new Date(getMessageTimestamp(right)).getTime() - new Date(getMessageTimestamp(left)).getTime(),
      );
      const lastMessage = messages[0];
      const lastMessageAt =
        chat.last_message_at ?? chat.last_message_sent_at ?? lastMessage?.sent_at ?? lastMessage?.created_at;

      return {
        client_id: chat.client_id,
        current_manager_id: chat.current_manager_id,
        displayName: getDisplayName(chat),
        incomingMessages: chat.incoming_messages,
        lastMessageAt: lastMessageAt ?? new Date(0).toISOString(),
        lastMessageText: chat.last_message_text ?? lastMessage?.text ?? null,
        manager_auth_user_id: chat.manager_auth_user_id,
        manager_company_role: chat.manager_company_role,
        manager_first_name: chat.manager_first_name,
        manager_last_name: chat.manager_last_name,
        messageCount: chat.total_messages ?? messages.length,
        messages,
        outgoingMessages: chat.outgoing_messages,
        telegram_chat_id: chat.telegram_chat_id,
      };
    })
    .sort(
      (left, right) =>
        new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime(),
    );
}
