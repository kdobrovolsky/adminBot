import { MessageCard } from "@/components/messages/MessageCard";
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

export default async function Home() {
  const { messages, errorMessage } = await getMessages();

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <section className="rounded-3xl bg-slate-900 px-6 py-8 text-white shadow-lg sm:px-8">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-slate-300">
            SupportBot Admin
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
            Сообщения из Telegram
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
            Простая readonly-админка, которая показывает сообщения из Supabase.
          </p>
        </section>

        {errorMessage ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {errorMessage}
          </section>
        ) : null}

        {!errorMessage && messages.length === 0 ? (
          <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Сообщений пока нет
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Когда новые сообщения появятся в таблице Supabase, они отобразятся
              здесь.
            </p>
          </section>
        ) : null}

        {messages.length > 0 ? (
          <section className="grid gap-4">
            {messages.map((message) => (
              <MessageCard
                key={`${message.telegram_chat_id}-${message.created_at}`}
                message={message}
              />
            ))}
          </section>
        ) : null}
      </div>
    </main>
  );
}
