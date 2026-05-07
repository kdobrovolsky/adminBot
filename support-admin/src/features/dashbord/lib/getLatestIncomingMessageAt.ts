import type { MessageRow } from "@/types/message";

export function getLatestIncomingMessageAt(
    messages: MessageRow[],
    clientId: number,
): string | null {
    for (const message of messages) {
        if (message.client_id !== clientId || message.direction !== "incoming") {
            continue;
        }

        return message.sent_at ?? message.created_at;
    }

    return null;
}