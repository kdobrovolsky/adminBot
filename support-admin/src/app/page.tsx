import { MessagesDashboard } from "@/components/messages/MessagesDashboard";
import { StatCard } from "@/components/messages/StatCard";
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

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8">
        <section className="rounded-[2rem] bg-slate-900 px-6 py-8 text-white shadow-xl sm:px-8 sm:py-10">
          <p className="text-sm font-medium uppercase tracking-[0.24em] text-slate-300">
            SupportBot Admin
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
            Центр сообщений
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300 sm:text-base">
            Readonly-страница для просмотра диалогов из Telegram в формате dashboard.
            Слева список диалогов, справа панель выбранной переписки и базовые метрики
            сверху.
          </p>
        </section>

        {errorMessage ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {errorMessage}
          </section>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-2">
          <StatCard
            label="Всего сообщений"
            value={messages.length.toString()}
            description="Общее количество записей, доступных в readonly-админке."
          />
          <StatCard
            label="Активные диалоги"
            value={dialogs.length.toString()}
            description={
              latestMessageAt
                ? `Последнее сообщение: ${dateFormatter.format(new Date(latestMessageAt))}`
                : "Пока нет данных для отображения."
            }
          />
        </section>

        <MessagesDashboard dialogs={dialogs} />
      </div>
    </main>
  );
}
