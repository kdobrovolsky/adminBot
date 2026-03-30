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
    <main className="min-h-screen px-3 py-6 text-slate-100 sm:px-5 sm:py-8 lg:px-8 lg:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 sm:gap-7 lg:gap-8">
        <section className="relative overflow-hidden rounded-[2rem] border border-slate-800/80 bg-[linear-gradient(145deg,#020617_0%,#0f172a_55%,#111827_100%)] px-5 py-7 text-white shadow-[0_30px_100px_rgba(2,6,23,0.55)] sm:rounded-[2.25rem] sm:px-8 sm:py-10 lg:rounded-[2.5rem] lg:px-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.22),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.16),transparent_24%)]" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-sky-100">
                SupportBot Admin
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-400">
                Premium readonly dashboard
              </span>
            </div>

            <h1 className="mt-5 max-w-4xl text-3xl font-semibold tracking-[-0.06em] text-white sm:mt-6 sm:text-5xl lg:text-[3.6rem]">
              Центр сообщений поддержки
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400 sm:mt-4 sm:text-base sm:leading-8">
              Современная readonly-админка для просмотра диалогов из Telegram: слева
              навигация по чатам, справа детальный просмотр выбранной переписки и ключевые
              метрики сверху.
            </p>
          </div>
        </section>

        {errorMessage ? (
          <section className="rounded-[1.5rem] border border-red-500/20 bg-[linear-gradient(180deg,rgba(69,10,10,0.48),rgba(127,29,29,0.18))] px-4 py-4 shadow-[0_18px_50px_rgba(69,10,10,0.18)] sm:rounded-[1.75rem] sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-red-300">
              Data Error
            </p>
            <p className="mt-2 text-sm leading-6 text-red-200">{errorMessage}</p>
          </section>
        ) : null}

        <section className="grid gap-4 md:grid-cols-2 xl:gap-5">
          <StatCard
            label="Всего сообщений"
            value={messages.length.toString()}
            description="Общее количество записей, доступных в readonly-админке сообщений."
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
