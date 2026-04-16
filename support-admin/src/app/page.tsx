import { redirect } from "next/navigation";
import { DashboardHeader } from "@/components/messages/DashboardHeader";
import { MessagesDashboard } from "@/components/messages/MessagesDashboard";
import { buildDialogs } from "@/lib/dialogs";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  ActiveChatRow,
  DashboardDataResult,
  DashboardStats,
  MessageRow,
  MessageStatsRow,
} from "@/types/message";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

const emptyStats: DashboardStats = {
  activeChatsCount: 0,
  incomingMessages: 0,
  outgoingMessages: 0,
  totalMessages: 0,
  unassignedClientsCount: 0,
};

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

async function getDashboardData(): Promise<DashboardDataResult> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirect("/login");
    }

    const [activeChatsResult, messagesResult, statsResult] = await Promise.all([
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
    ]);

    if (activeChatsResult.error) {
      return {
        currentUserId: user.id,
        dialogs: [],
        errorMessage: `Failed to load active chats: ${activeChatsResult.error.message}`,
        stats: mapStats(statsResult.data),
      };
    }

    if (messagesResult.error) {
      return {
        currentUserId: user.id,
        dialogs: [],
        errorMessage: `Failed to load messages: ${messagesResult.error.message}`,
        stats: mapStats(statsResult.data),
      };
    }

    const activeChats = (activeChatsResult.data ?? []) as unknown as ActiveChatRow[];
    const messages = (messagesResult.data ?? []) as unknown as MessageRow[];

    return {
      dialogs: buildDialogs(activeChats, messages),
      errorMessage: null,
      currentUserId: user.id,
      stats: mapStats(statsResult.data),
    };
  } catch {
    return {
      currentUserId: null,
      dialogs: [],
      errorMessage: "Check Supabase environment variables for the admin app.",
      stats: emptyStats,
    };
  }
}

export default async function Home() {
  const { currentUserId, dialogs, errorMessage, stats } = await getDashboardData();
  const latestMessageAt = dialogs[0]?.lastMessageAt ?? null;
  const latestMessageLabel = latestMessageAt
    ? dateFormatter.format(new Date(latestMessageAt))
    : "No data yet";

  return (
    <main className="min-h-screen px-3 py-6 text-slate-100 sm:px-5 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 sm:gap-7 lg:gap-8">
        <DashboardHeader
          dialogsCount={stats.activeChatsCount || dialogs.length}
          latestMessageLabel={latestMessageLabel}
          messagesCount={stats.totalMessages}
        />

        {errorMessage ? (
          <section className="rounded-[1.5rem] border border-red-500/20 bg-[linear-gradient(180deg,rgba(69,10,10,0.48),rgba(127,29,29,0.18))] px-4 py-4 shadow-[0_18px_50px_rgba(69,10,10,0.18)] sm:rounded-[1.75rem] sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-red-300">
              Data Error
            </p>
            <p className="mt-2 text-sm leading-6 text-red-200">{errorMessage}</p>
          </section>
        ) : null}

        <MessagesDashboard currentUserId={currentUserId} dialogs={dialogs} />
      </div>
    </main>
  );
}
