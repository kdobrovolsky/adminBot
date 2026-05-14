import { redirect } from "next/navigation";
import { buildDialogs } from "@/lib/dialogs";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
    ActiveChatRow,
    AiInteractionRow,
    DashboardDataResult,
    DialogClosureRow,
    ManagerSummary,
    MessageRow,
} from "@/types/message";
import { getLatestIncomingMessageAt } from "../lib/getLatestIncomingMessageAt";
import { getManagerDisplayName } from "../lib/getManagerDisplayName";
import { mapStats } from "../lib/mapStats";
import { resolveCurrentManagerId } from "../lib/resolveCurrentManagerId";
import { shouldAutoReopenDialog } from "../lib/shouldAutoReopenDialog";

type LoadDashboardDataOptions = {
    redirectOnUnauthenticated: boolean;
};

export async function loadDashboardData(
    options: LoadDashboardDataOptions,
): Promise<DashboardDataResult | null> {
    const supabase = await createServerSupabaseClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        if (options.redirectOnUnauthenticated) {
            redirect("/login");
        }

        return null;
    }

        const [activeChatsResult, messagesResult, statsResult, managersResult, closuresResult, aiInteractionsResult] =
            await Promise.all([
                supabase
                    .from("active_chats")
                    .select(
                        [
                            "client_id",
                            "current_manager_id",
                            "first_name",
                            "incoming_messages",
                            "last_message_at",
                            "last_message_text",
                            "last_message_sent_at",
                            "last_name",
                            "manager_auth_user_id",
                            "manager_company_role",
                            "manager_first_name",
                            "manager_last_name",
                            "outgoing_messages",
                            "telegram_chat_id",
                            "telegram_user_id",
                            "total_messages",
                            "username",
                        ].join(", "),
                    )
                    .order("last_message_at", { ascending: false }),

                supabase
                    .from("messages")
                    .select("client_id, created_at, direction, manager_id, message_text, sent_at")
                    .order("sent_at", { ascending: false }),

                supabase.from("message_stats").select("*").maybeSingle(),

                supabase
                    .from("manager_details")
                    .select("id, auth_user_id, email, first_name, last_name, company_role")
                    .order("first_name", { ascending: true }),

                supabase
                    .from("dialog_closures")
                    .select(
                        "client_id, close_reason, close_comment, closed_at, closed_by_manager_id, assigned_manager_id_at_close, reopened_at, reopened_by_manager_id, updated_at",
                    ),

                supabase
                    .from("ai_interactions")
                    .select("client_id, created_at, priority, status")
                    .order("created_at", { ascending: false }),
            ]);

        if (activeChatsResult.error) {
            return {
                currentManagerId: null,
                currentUserId: user.id,
                dialogs: [],
                errorMessage: `Failed to load active chats: ${activeChatsResult.error.message}`,
                managers: [],
                stats: mapStats(statsResult.data),
            };
        }

        if (messagesResult.error) {
            return {
                currentManagerId: null,
                currentUserId: user.id,
                dialogs: [],
                errorMessage: `Failed to load messages: ${messagesResult.error.message}`,
                managers: [],
                stats: mapStats(statsResult.data),
            };
        }

        if (managersResult.error) {
            return {
                currentManagerId: null,
                currentUserId: user.id,
                dialogs: [],
                errorMessage: `Failed to load managers: ${managersResult.error.message}`,
                managers: [],
                stats: mapStats(statsResult.data),
            };
        }

        if (closuresResult.error) {
            return {
                currentManagerId: null,
                currentUserId: user.id,
                dialogs: [],
                errorMessage: `Failed to load dialog closures: ${closuresResult.error.message}`,
                managers: [],
                stats: mapStats(statsResult.data),
            };
        }

        if (aiInteractionsResult.error) {
            return {
                currentManagerId: null,
                currentUserId: user.id,
                dialogs: [],
                errorMessage: `Failed to load AI interactions: ${aiInteractionsResult.error.message}`,
                managers: [],
                stats: mapStats(statsResult.data),
            };
        }

        const activeChats = (activeChatsResult.data ?? []) as unknown as ActiveChatRow[];
        const messages = (messagesResult.data ?? []) as unknown as MessageRow[];
        const managers = (managersResult.data ?? []) as unknown as ManagerSummary[];
        const closures = (closuresResult.data ?? []) as unknown as DialogClosureRow[];
        const aiInteractions = (aiInteractionsResult.data ?? []) as unknown as AiInteractionRow[];

        const currentManagerId = resolveCurrentManagerId(managers, {
            email: user.email,
            id: user.id,
        });

        const closuresToAutoReopen = closures.filter((closure) =>
            shouldAutoReopenDialog(
                closure,
                getLatestIncomingMessageAt(messages, closure.client_id),
            ),
        );

        if (closuresToAutoReopen.length > 0) {
            const reopenedAt = new Date().toISOString();

            const { error: reopenSyncError } = await supabase
                .from("dialog_closures")
                .update({
                    reopened_at: reopenedAt,
                    reopened_by_manager_id: null,
                    updated_at: reopenedAt,
                })
                .in(
                    "client_id",
                    closuresToAutoReopen.map((closure) => closure.client_id),
                )
                .is("reopened_at", null);

            if (reopenSyncError) {
                return {
                    currentManagerId: null,
                    currentUserId: user.id,
                    dialogs: [],
                    errorMessage: `Failed to sync reopened dialogs: ${reopenSyncError.message}`,
                    managers: [],
                    stats: mapStats(statsResult.data),
                };
            }
        }

        const managerById = new Map(managers.map((manager) => [manager.id, manager]));
        const latestAiInteractionByClientId = new Map<number, AiInteractionRow>();

        for (const interaction of aiInteractions) {
            if (!latestAiInteractionByClientId.has(interaction.client_id)) {
                latestAiInteractionByClientId.set(interaction.client_id, interaction);
            }
        }

        const activeClosureByClientId = new Map(
            closures
                .filter((closure) => {
                    const autoReopened = closuresToAutoReopen.some(
                        (autoReopenedClosure) => autoReopenedClosure.client_id === closure.client_id,
                    );

                    return closure.reopened_at === null && !autoReopened;
                })
                .map((closure) => [closure.client_id, closure]),
        );

        const dialogs = buildDialogs(activeChats, messages).map((dialog) => {
            const closure = activeClosureByClientId.get(dialog.client_id);
            const latestAiInteraction = latestAiInteractionByClientId.get(dialog.client_id);

            if (!closure) {
                return {
                    ...dialog,
                    aiInteractionCreatedAt: latestAiInteraction?.created_at ?? null,
                    aiInteractionPriority: latestAiInteraction?.priority ?? null,
                    aiInteractionStatus: latestAiInteraction?.status ?? null,
                    closeComment: null,
                    closeReason: null,
                    closedAt: null,
                    closedByManagerId: null,
                    closedByManagerName: null,
                    isClosed: false,
                    reopenedAt: null,
                    reopenedByManagerId: null,
                    reopenedByManagerName: null,
                };
            }

            return {
                ...dialog,
                aiInteractionCreatedAt: latestAiInteraction?.created_at ?? null,
                aiInteractionPriority: latestAiInteraction?.priority ?? null,
                aiInteractionStatus: latestAiInteraction?.status ?? null,
                closeComment: closure.close_comment,
                closeReason: closure.close_reason,
                closedAt: closure.closed_at,
                closedByManagerId: closure.closed_by_manager_id,
                closedByManagerName:
                    getManagerDisplayName(managerById.get(closure.closed_by_manager_id)) ??
                    "Unknown manager",
                isClosed: true,
                reopenedAt: closure.reopened_at,
                reopenedByManagerId: closure.reopened_by_manager_id,
                reopenedByManagerName:
                    getManagerDisplayName(
                        closure.reopened_by_manager_id
                            ? managerById.get(closure.reopened_by_manager_id)
                            : undefined,
                    ) ?? null,
            };
        });

        return {
            currentManagerId,
            currentUserId: user.id,
            dialogs,
            errorMessage: null,
            managers,
            stats: mapStats(statsResult.data),
        };
}

export async function getDashboardData(): Promise<DashboardDataResult> {
    const result = await loadDashboardData({
        redirectOnUnauthenticated: true,
    });

    if (!result) {
        redirect("/login");
    }

    return result;
}
