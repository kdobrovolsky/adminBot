import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/messages/DashboardHeader";
import { MessagesDashboard } from "@/components/messages/MessagesDashboard";
import { buildDialogs } from "@/lib/dialogs";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ActiveChatRow,
  DashboardDataResult,
  DialogClosureRow,
  DashboardStats,
  ManagerSummary,
  MessageRow,
  MessageStatsRow,
} from "@/types/message";

export const dynamic = "force-dynamic";

const emptyStats: DashboardStats = {
  activeChatsCount: 0,
  incomingMessages: 0,
  outgoingMessages: 0,
  totalMessages: 0,
  unassignedClientsCount: 0,
};

function resolveCurrentManagerId(
  managers: ManagerSummary[],
  user: { email?: string | null; id: string },
): number | null {
  const byAuthUserId = managers.find((manager) => manager.auth_user_id === user.id);

  if (byAuthUserId) {
    return byAuthUserId.id;
  }

  const normalizedEmail = user.email?.trim().toLowerCase();

  if (!normalizedEmail) {
    return null;
  }

  const byEmail = managers.find((manager) => manager.email?.trim().toLowerCase() === normalizedEmail);

  return byEmail?.id ?? null;
}

function mapStats(row: MessageStatsRow | null | undefined): DashboardStats {
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

function getManagerDisplayName(manager: ManagerSummary | undefined): string | null {
  if (!manager) {
    return null;
  }

  const fullName = [manager.first_name?.trim(), manager.last_name?.trim()].filter(Boolean).join(" ");

  return fullName || manager.email?.trim() || `Manager #${manager.id}`;
}

function getLatestIncomingMessageAt(messages: MessageRow[], clientId: number): string | null {
  for (const message of messages) {
    if (message.client_id !== clientId || message.direction !== "incoming") {
      continue;
    }

    return message.sent_at ?? message.created_at;
  }

  return null;
}

function shouldAutoReopenDialog(closure: DialogClosureRow, latestIncomingMessageAt: string | null): boolean {
  if (closure.reopened_at !== null || !latestIncomingMessageAt) {
    return false;
  }

  return new Date(latestIncomingMessageAt).getTime() > new Date(closure.closed_at).getTime();
}

async function getDashboardData(): Promise<DashboardDataResult> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const [activeChatsResult, messagesResult, statsResult, managersResult, closuresResult] = await Promise.all([
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

    const activeChats = (activeChatsResult.data ?? []) as unknown as ActiveChatRow[];
    const messages = (messagesResult.data ?? []) as unknown as MessageRow[];
    const managers = (managersResult.data ?? []) as unknown as ManagerSummary[];
    const closures = (closuresResult.data ?? []) as unknown as DialogClosureRow[];
    const currentManagerId = resolveCurrentManagerId(managers, {
      email: user.email,
      id: user.id,
    });
    const closuresToAutoReopen = closures.filter((closure) =>
      shouldAutoReopenDialog(closure, getLatestIncomingMessageAt(messages, closure.client_id)),
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

      if (!closure) {
        return {
          ...dialog,
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
        closeComment: closure.close_comment,
        closeReason: closure.close_reason,
        closedAt: closure.closed_at,
        closedByManagerId: closure.closed_by_manager_id,
        closedByManagerName: getManagerDisplayName(managerById.get(closure.closed_by_manager_id)) ?? "Unknown manager",
        isClosed: true,
        reopenedAt: closure.reopened_at,
        reopenedByManagerId: closure.reopened_by_manager_id,
        reopenedByManagerName:
          getManagerDisplayName(
            closure.reopened_by_manager_id ? managerById.get(closure.reopened_by_manager_id) : undefined,
          ) ?? null,
      };
    });

    return {
      currentManagerId,
      dialogs,
      errorMessage: null,
      currentUserId: user.id,
      managers,
      stats: mapStats(statsResult.data),
    };
  } catch {
    return {
      currentManagerId: null,
      currentUserId: null,
      dialogs: [],
      errorMessage: "Check Supabase environment variables for the admin app.",
      managers: [],
      stats: emptyStats,
    };
  }
}

export default async function Home() {
  const { currentManagerId, currentUserId, dialogs, errorMessage, managers } = await getDashboardData();

  return (
    <main className="min-h-screen px-3 py-4 text-slate-100 sm:px-4 sm:py-5 lg:px-6 lg:py-6">
      <div className="mx-auto flex w-full max-w-[92rem] flex-col gap-4 sm:gap-5">
        <DashboardHeader />

        {errorMessage ? (
          <section className="rounded-[1rem] border border-red-500/20 bg-[linear-gradient(180deg,rgba(69,10,10,0.48),rgba(127,29,29,0.18))] px-4 py-3 shadow-[0_12px_34px_rgba(69,10,10,0.14)] sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-red-300">
              Data Error
            </p>
            <p className="mt-2 text-sm leading-6 text-red-200">{errorMessage}</p>
          </section>
        ) : null}

        <MessagesDashboard
          currentManagerId={currentManagerId}
          currentUserId={currentUserId}
          dialogs={dialogs}
          managers={managers}
        />
      </div>
    </main>
  );
}
