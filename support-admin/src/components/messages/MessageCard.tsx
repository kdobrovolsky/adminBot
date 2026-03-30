import type { Message } from "@/types/message";

type MessageCardProps = {
  message: Message;
};

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function MessageCard({ message }: MessageCardProps) {
  const createdAt = dateFormatter.format(new Date(message.created_at));

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-slate-500">Username</p>
          <p className="text-base font-semibold text-slate-900">
            {message.username || "Без username"}
          </p>
        </div>
        <div className="space-y-1 sm:text-right">
          <p className="text-sm font-medium text-slate-500">Получено</p>
          <p className="text-sm text-slate-700">{createdAt}</p>
        </div>
      </div>

      <div className="mt-4 space-y-1">
        <p className="text-sm font-medium text-slate-500">Сообщение</p>
        <p className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-800">
          {message.text || "Пустое сообщение"}
        </p>
      </div>

      <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3">
        <p className="text-sm font-medium text-slate-500">Telegram chat ID</p>
        <p className="mt-1 break-all font-mono text-sm text-slate-800">
          {message.telegram_chat_id}
        </p>
      </div>
    </article>
  );
}
