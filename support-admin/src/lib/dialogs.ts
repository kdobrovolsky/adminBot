import type { DialogViewModel, Message } from "@/types/message";

function getDisplayName(messages: Message[]): string {
  const usernameMessage = messages.find((message) => {
    const username = message.username?.trim();

    return Boolean(username);
  });

  if (usernameMessage?.username?.trim()) {
    return usernameMessage.username.trim();
  }

  const firstNamedMessage = messages.find((message) => {
    const fullName = [message.first_name?.trim(), message.last_name?.trim()]
      .filter(Boolean)
      .join(" ");

    return Boolean(fullName);
  });

  if (firstNamedMessage) {
    return [firstNamedMessage.first_name?.trim(), firstNamedMessage.last_name?.trim()]
      .filter(Boolean)
      .join(" ");
  }

  return "Без username";
}

export function groupMessagesByDialog(messages: Message[]): DialogViewModel[] {
  const dialogsMap = new Map<Message["telegram_chat_id"], Message[]>();

  for (const message of messages) {
    const dialogMessages = dialogsMap.get(message.telegram_chat_id);

    if (dialogMessages) {
      dialogMessages.push(message);
      continue;
    }

    dialogsMap.set(message.telegram_chat_id, [message]);
  }

  return [...dialogsMap.entries()]
    .map(([telegram_chat_id, dialogMessages]): DialogViewModel => {
      const messagesByDate = [...dialogMessages].sort(
        (left, right) =>
          new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
      );
      const lastMessage = messagesByDate[0];

      return {
        telegram_chat_id,
        displayName: getDisplayName(messagesByDate),
        lastMessageAt: lastMessage.created_at,
        lastMessageText: lastMessage.text,
        messageCount: messagesByDate.length,
        messages: messagesByDate,
      };
    })
    .sort(
      (left, right) =>
        new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime(),
    );
}
