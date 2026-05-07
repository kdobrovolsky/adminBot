import type { DashboardStats, MessageStatsRow } from "@/types/message";
import { emptyStats } from "../constants/emptyStats";

export function mapStats(row: MessageStatsRow | null | undefined): DashboardStats {
    if (!row) {
        return emptyStats;
    }

    return {
        activeChatsCount: row.active_chats_count,
        incomingMessages: row.incoming_messages,
        outgoingMessages: row.outgoing_messages,
        totalMessages: row.total_messages,
        unassignedClientsCount: row.unassigned_clients_count,
    };
}