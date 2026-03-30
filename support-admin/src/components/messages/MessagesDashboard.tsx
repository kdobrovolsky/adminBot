"use client";

import { useMemo, useState } from "react";
import { DialogListItem } from "@/components/messages/DialogListItem";
import type { DialogViewModel } from "@/types/message";

type MessagesDashboardProps = {
  dialogs: DialogViewModel[];
};

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

function formatMessagePreview(text: string | null) {
  if (!text) {
    return "Пустое сообщение";
  }

  return text.length > 96 ? `${text.slice(0, 96)}...` : text;
}

export function MessagesDashboard({ dialogs }: MessagesDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChatId, setSelectedChatId] = useState<
    DialogViewModel["telegram_chat_id"] | null
  >(dialogs[0]?.telegram_chat_id ?? null);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredDialogs = useMemo(() => {
    if (!normalizedQuery) {
      return dialogs;
    }

    return dialogs.filter((dialog) => {
      const searchableValues = [
        dialog.displayName.toLowerCase(),
        String(dialog.telegram_chat_id).toLowerCase(),
        dialog.lastMessageText?.toLowerCase() ?? "",
      ];

      return searchableValues.some((value) => value.includes(normalizedQuery));
    });
  }, [dialogs, normalizedQuery]);

  const selectedDialog =
    filteredDialogs.find((dialog) => dialog.telegram_chat_id === selectedChatId) ??
    filteredDialogs[0] ??
    null;
  const selectedMessages = selectedDialog?.messages.slice(0, 5) ?? [];

  return (
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
            {filteredDialogs.length}
          </span>
        </div>

        <div className="mt-4">
          <label className="sr-only" htmlFor="dialogs-search">
            Поиск по диалогам
          </label>
          <input
            id="dialogs-search"
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Поиск по имени, chat ID или сообщению"
            className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
          />
        </div>

        <div className="mt-4 space-y-3">
          {filteredDialogs.length > 0 ? (
            filteredDialogs.map((dialog) => (
              <DialogListItem
                key={String(dialog.telegram_chat_id)}
                chatId={dialog.telegram_chat_id}
                isActive={dialog.telegram_chat_id === selectedDialog?.telegram_chat_id}
                lastMessageAt={dialog.lastMessageAt}
                messageCount={dialog.messageCount}
                onSelect={() => setSelectedChatId(dialog.telegram_chat_id)}
                preview={formatMessagePreview(dialog.lastMessageText)}
                username={dialog.displayName}
              />
            ))
          ) : dialogs.length > 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
              По вашему запросу диалоги не найдены.
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-sm text-slate-500">
              Диалоги появятся здесь, когда в базе будут сообщения.
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
              {selectedDialog?.displayName || "Выберите диалог"}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">
              {selectedDialog
                ? "Панель показывает выбранный диалог и последние сообщения без редактирования."
                : "Пока нет данных. Секция оставлена как readonly-заглушка под будущую логику."}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl bg-slate-50 px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                Chat ID
              </p>
              <p className="mt-2 break-all font-mono text-sm text-slate-800">
                {selectedDialog ? selectedDialog.telegram_chat_id : "—"}
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

        <div className="mt-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Последние сообщения</h3>
            <span className="text-sm text-slate-500">
              {selectedDialog ? `${selectedDialog.messageCount} всего` : "0 всего"}
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
      </section>
    </section>
  );
}
