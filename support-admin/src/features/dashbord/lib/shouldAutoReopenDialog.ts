import type { DialogClosureRow } from "@/types/message";

export function shouldAutoReopenDialog(
    closure: DialogClosureRow,
    latestIncomingMessageAt: string | null,
): boolean {
    if (closure.reopened_at !== null || !latestIncomingMessageAt) {
        return false;
    }

    return new Date(latestIncomingMessageAt).getTime() > new Date(closure.closed_at).getTime();
}