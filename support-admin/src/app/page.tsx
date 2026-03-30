import { DialogListItem } from "@/components/messages/DialogListItem";
import { StatCard } from "@/components/messages/StatCard";
import { getSupabaseClient } from "@/lib/supabase";
import type { Message } from "@/types/message";

export const dynamic = "force-dynamic";

type TelegramMessageRow = {
  chat_id: number | string;
  created_at: string;
  message_text: string | null;
  username: string | null;
};

type MessagesResult = {
  errorMessage: string | null;
  messages: Message[];
};

type DialogSummary = {
  chatId: Message["telegram_chat_id"];
  username: string | null;
  lastMessageAt: string;
  lastMessageText: string | null;
  messages: Message[];
};

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

async function getMessages(): Promise<MessagesResult> {
  try {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from("telegram_messages")
      .select("username, message_text, created_at, chat_id")
      .order("created_at", { ascending: false });

    if (error) {
      return {
        errorMessage: `Не удалось загрузить сообщения из Supabase: ${error.message}`,
        messages: [],
      };
    }

    return {
      errorMessage: null,
      messages: (data satisfies TelegramMessageRow[]).map(
        (message): Message => ({
          created_at: message.created_at,
          telegram_chat_id: message.chat_id,
          text: message.message_text,
          username: message.username,
        }),
      ),
    };
  } catch {
    return {
      errorMessage: "Проверьте env-переменные Supabase для админки.",
      messages: [],
    };
  }
}

function buildDialogs(messages: Message[]): DialogSummary[] {
  const dialogsMap = new Map<Message["telegram_chat_id"], DialogSummary>();

  for (const message of messages) {
    const existingDialog = dialogsMap.get(message.telegram_chat_id);

    if (!existingDialog) {
      dialogsMap.set(message.telegram_chat_id, {
        chatId: message.telegram_chat_id,
        username: message.username,
        lastMessageAt: message.created_at,
        lastMessageText: message.text,
        messages: [message],
      });

      continue;
    }

    existingDialog.messages.push(message);
  }

  return [...dialogsMap.values()].sort(
    (left, right) =>
      new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime(),
  );
}

function formatMessagePreview(text: string | null) {
  if (!text) {
    return "Пустое сообщение";
  }

  return text.length > 96 ? `${text.slice(0, 96)}...` : text;
}

export default async function Home() {
  const { messages, errorMessage } = await getMessages();
  const dialogs = buildDialogs(messages);
  const selectedDialog = dialogs[0] ?? null;
  const selectedMessages = [...(selectedDialog?.messages ?? [])]
    .sort(
      (left, right) =>
        new Date(right.created_at).getTime() - new Date(left.created_at).getTime(),
    )
    .slice(0, 5);
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
            Слева список диалогов, справа панель выбранной переписки и базовые метрики сверху.
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

        <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Диалоги</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Список чатов с последним сообщением и временем обновления.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                {dialogs.length}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {dialogs.length > 0 ? (
                dialogs.map((dialog, index) => (
                  <DialogListItem
                    key={String(dialog.chatId)}
                    chatId={dialog.chatId}
                    isActive={index === 0}
                    lastMessageAt={dialog.lastMessageAt}
                    messageCount={dialog.messages.length}
                    preview={formatMessagePreview(dialog.lastMessageText)}
                    username={dialog.username}
                  />
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
                  Диалоги появятся здесь, когда в таблице Supabase будут сообщения.
                </div>
              )}
            </div>
          </aside>

          <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-400">
                  Dialog Details
                </p>
                <h2 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
                  {selectedDialog?.username || "Выберите диалог"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-500">
                  {selectedDialog
                    ? "Панель подготовлена под будущую детализацию переписки, статусов и действий оператора."
                    : "Пока нет данных. Секция оставлена как readonly-заглушка под будущую логику."}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                    Chat ID
                  </p>
                  <p className="mt-2 break-all font-mono text-sm text-slate-800">
                    {selectedDialog ? selectedDialog.chatId : "—"}
                  </p>
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                    Последняя активность
                  </p>
                  <p className="mt-2 text-sm text-slate-800">
                    {selectedDialog
                      ? dateFormatter.format(new Date(selectedDialog.lastMessageAt))
                      : "—"}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-slate-900">
                    Последние сообщения
                  </h3>
                  <span className="text-sm text-slate-500">
                    {selectedDialog ? `${selectedDialog.messages.length} всего` : "0 всего"}
                  </span>
                </div>

                {selectedMessages.length > 0 ? (
                  selectedMessages.map((message) => (
                    <article
                      key={`${message.telegram_chat_id}-${message.created_at}`}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {message.username || "Без username"}
                          </p>
                          <p className="mt-1 text-xs uppercase tracking-[0.16em] text-slate-400">
                            Telegram message
                          </p>
                        </div>
                        <p className="text-sm text-slate-500">
                          {dateFormatter.format(new Date(message.created_at))}
                        </p>
                      </div>
                      <p className="mt-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
                        {message.text || "Пустое сообщение"}
                      </p>
                    </article>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-sm text-slate-500">
                    Здесь появится история выбранного диалога.
                  </div>
                )}
              </div>

              <aside className="rounded-[1.75rem] bg-slate-900 p-5 text-white">
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                  Readonly Notes
                </p>
                <h3 className="mt-3 text-lg font-semibold">Панель резюме</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">
                  Блок оставлен простым: сюда позже можно добавить теги, статусы, карточку
                  пользователя или действия оператора без пересборки layout.
                </p>

                <div className="mt-5 space-y-3">
                  <div className="rounded-2xl bg-white/10 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                      Статус
                    </p>
                    <p className="mt-2 text-sm text-white">Readonly preview</p>
                  </div>
                  <div className="rounded-2xl bg-white/10 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                      Следующий шаг
                    </p>
                    <p className="mt-2 text-sm text-white">
                      Подключить выбор диалога и реальные действия.
                    </p>
                  </div>
                </div>
              </aside>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
