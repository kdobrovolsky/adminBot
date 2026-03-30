import { DashboardHeader } from "@/components/messages/DashboardHeader";
import { MessagesDashboard } from "@/components/messages/MessagesDashboard";
import { groupMessagesByDialog } from "@/lib/dialogs";
import { getSupabaseClient } from "@/lib/supabase";
import type { Message, MessagesResult, TelegramMessageRow } from "@/types/message";

export const dynamic = "force-dynamic";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

function mapMessageRow(row: TelegramMessageRow): Message | null {
  const telegramChatId = row.telegram_chat_id ?? row.chat_id;

  if (telegramChatId === null || telegramChatId === undefined) {
    return null;
  }

  return {
    created_at: row.created_at,
    telegram_chat_id: telegramChatId,
    text: row.message_text ?? row.text ?? null,
    first_name: row.first_name ?? null,
    last_name: row.last_name ?? null,
    sent_at: row.sent_at ?? null,
    username: row.username,
  };
}

async function loadMessagesFromTable(
  tableName: "messages" | "telegram_messages",
): Promise<MessagesResult> {
  const supabase = getSupabaseClient();
  const query =
    tableName === "telegram_messages"
      ? supabase
          .from(tableName)
          .select(
            "username, first_name, last_name, created_at, sent_at, chat_id, message_text",
          )
          .order("sent_at", { ascending: false })
      : supabase
          .from(tableName)
          .select("username, created_at, chat_id, telegram_chat_id, message_text, text")
          .order("created_at", { ascending: false });
  const { data, error } = await query;

  if (error) {
    return {
      errorMessage: `Не удалось загрузить сообщения из таблицы ${tableName}: ${error.message}`,
      messages: [],
    };
  }

  return {
    errorMessage: null,
    messages: (data satisfies TelegramMessageRow[])
      .map(mapMessageRow)
      .filter((message): message is Message => message !== null),
  };
}

async function getMessages(): Promise<MessagesResult> {
  try {
    const primaryResult = await loadMessagesFromTable("telegram_messages");

    if (primaryResult.messages.length > 0 || primaryResult.errorMessage === null) {
      return primaryResult;
    }

    const fallbackResult = await loadMessagesFromTable("messages");

    if (fallbackResult.messages.length > 0 || fallbackResult.errorMessage === null) {
      return fallbackResult;
    }

    return {
      errorMessage: primaryResult.errorMessage,
      messages: [],
    };
  } catch {
    return {
      errorMessage: "Проверьте env-переменные Supabase для админки.",
      messages: [],
    };
  }
}

export default async function Home() {
  const { messages, errorMessage } = await getMessages();
  const dialogs = groupMessagesByDialog(messages);
  const latestMessageAt = messages[0]?.created_at ?? null;
  const latestMessageLabel = latestMessageAt
    ? dateFormatter.format(new Date(latestMessageAt))
    : "Пока нет данных";

  return (
    <main className="min-h-screen px-3 py-6 text-slate-100 sm:px-5 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 sm:gap-7 lg:gap-8">
        <DashboardHeader
          dialogsCount={dialogs.length}
          latestMessageLabel={latestMessageLabel}
          messagesCount={messages.length}
        />

        {errorMessage ? (
          <section className="rounded-[1.5rem] border border-red-500/20 bg-[linear-gradient(180deg,rgba(69,10,10,0.48),rgba(127,29,29,0.18))] px-4 py-4 shadow-[0_18px_50px_rgba(69,10,10,0.18)] sm:rounded-[1.75rem] sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-red-300">
              Data Error
            </p>
            <p className="mt-2 text-sm leading-6 text-red-200">{errorMessage}</p>
          </section>
        ) : null}

        <MessagesDashboard dialogs={dialogs} />
      </div>
    </main>
  );
}
