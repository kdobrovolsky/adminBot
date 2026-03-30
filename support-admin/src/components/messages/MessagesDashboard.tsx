"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DialogListItem } from "@/components/messages/DialogListItem";
import type { DialogViewModel } from "@/types/message";

type MessagesDashboardProps = {
  dialogs: DialogViewModel[];
};

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

const MESSAGES_PER_PAGE = 5;
const secondaryButtonClassName =
  "rounded-xl border border-slate-700/90 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.76))] px-3.5 py-2 text-[13px] font-semibold text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-500/40 hover:bg-[linear-gradient(180deg,rgba(30,41,59,0.96),rgba(15,23,42,0.88))] hover:text-white hover:shadow-[0_12px_24px_rgba(2,132,199,0.12)] active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:translate-y-0 disabled:scale-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900/70 disabled:text-slate-500 disabled:shadow-none";
const compactButtonClassName =
  "rounded-full border border-slate-700/90 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.76))] px-3.5 py-1.5 text-[11px] font-semibold text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-500/40 hover:bg-[linear-gradient(180deg,rgba(30,41,59,0.96),rgba(15,23,42,0.88))] hover:text-white hover:shadow-[0_12px_24px_rgba(2,132,199,0.12)] active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:translate-y-0 disabled:scale-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900/70 disabled:text-slate-500 disabled:shadow-none";

function formatMessagePreview(text: string | null) {
  if (!text) {
    return "Пустое сообщение";
  }

  return text.length > 96 ? `${text.slice(0, 96)}...` : text;
}

export function MessagesDashboard({ dialogs }: MessagesDashboardProps) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChatId, setSelectedChatId] = useState<
    DialogViewModel["telegram_chat_id"] | null
  >(dialogs[0]?.telegram_chat_id ?? null);
  const [currentPage, setCurrentPage] = useState(1);

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
  const totalPages = Math.max(
    1,
    Math.ceil((selectedDialog?.messages.length ?? 0) / MESSAGES_PER_PAGE),
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * MESSAGES_PER_PAGE;
  const selectedMessages =
    selectedDialog?.messages.slice(pageStartIndex, pageStartIndex + MESSAGES_PER_PAGE) ?? [];

  return (
    <section className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[380px_minmax(0,1fr)]">
      <aside className="rounded-[1.75rem] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(2,6,23,0.9),rgba(15,23,42,0.8))] p-4 shadow-[0_24px_80px_rgba(2,6,23,0.44)] backdrop-blur sm:rounded-[2rem] sm:p-5 xl:p-6">
        <div className="flex items-start justify-between gap-4 border-b border-slate-800/90 pb-5">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Inbox
            </p>
            <h2 className="mt-2 text-[1.35rem] font-semibold tracking-[-0.03em] text-slate-50">
              Диалоги
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="rounded-full border border-slate-800 bg-slate-900/90 px-3 py-1 text-[11px] font-semibold text-slate-400">
              {filteredDialogs.length}
            </span>
            <button
              type="button"
              onClick={() => startTransition(() => router.refresh())}
              disabled={isRefreshing}
              className={compactButtonClassName}
            >
              {isRefreshing ? "Обновление..." : "Обновить"}
            </button>
          </div>
        </div>

        <div className="mt-5">
          <label className="sr-only" htmlFor="dialogs-search">
            Поиск по диалогам
          </label>
          <div className="rounded-[1.4rem] border border-slate-800 bg-slate-950/75 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
            <input
              id="dialogs-search"
              type="search"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Поиск по имени, chat ID или сообщению"
              className="w-full bg-transparent text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-5">
          <div className="space-y-3 overflow-y-auto pr-1 xl:max-h-[calc(100vh-23rem)] [scrollbar-color:#334155_transparent] [scrollbar-width:thin]">
            {filteredDialogs.length > 0 ? (
              filteredDialogs.map((dialog) => (
                <DialogListItem
                  key={String(dialog.telegram_chat_id)}
                  chatId={dialog.telegram_chat_id}
                  isActive={dialog.telegram_chat_id === selectedDialog?.telegram_chat_id}
                  lastMessageAt={dialog.lastMessageAt}
                  messageCount={dialog.messageCount}
                  onSelect={() => {
                    setSelectedChatId(dialog.telegram_chat_id);
                    setCurrentPage(1);
                  }}
                  preview={formatMessagePreview(dialog.lastMessageText)}
                  username={dialog.displayName}
                />
              ))
            ) : dialogs.length > 0 ? (
              <div className="rounded-[1.6rem] border border-dashed border-slate-700 bg-slate-950/60 px-5 py-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <p className="text-sm font-medium text-slate-300">Ничего не найдено</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Попробуйте имя пользователя, chat ID или фрагмент последнего сообщения.
                </p>
              </div>
            ) : (
              <div className="rounded-[1.6rem] border border-dashed border-slate-700 bg-slate-950/60 px-5 py-10 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <p className="text-sm font-medium text-slate-300">Диалогов пока нет</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Список появится, когда в базе будут сохранены сообщения.
                </p>
              </div>
            )}
          </div>
        </div>
      </aside>

      <section className="rounded-[1.75rem] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(15,23,42,0.78))] p-4 shadow-[0_24px_80px_rgba(2,6,23,0.44)] backdrop-blur sm:rounded-[2rem] sm:p-6 xl:p-7">
        <div className="flex flex-col gap-5 border-b border-slate-800/90 pb-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Dialog Details
            </p>
            <h2 className="mt-2 text-[1.6rem] font-semibold tracking-[-0.045em] text-slate-50 sm:text-[1.9rem]">
              {selectedDialog?.displayName || "Выберите диалог"}
            </h2>
          </div>

          <div className="flex flex-wrap items-start gap-2.5 lg:max-w-[24rem] lg:justify-end">
            <div className="min-w-[10.5rem] rounded-[0.95rem] border border-slate-800/90 bg-slate-950/45 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
              <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Chat ID
              </p>
              <p className="mt-1.5 break-all font-mono text-[12px] text-slate-300">
                {selectedDialog ? selectedDialog.telegram_chat_id : "—"}
              </p>
            </div>
            <div className="min-w-[10.5rem] rounded-[0.95rem] border border-slate-800/90 bg-slate-950/45 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
              <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Последняя активность
              </p>
              <p className="mt-1.5 text-[12px] text-slate-300">
                {selectedDialog
                  ? dateFormatter.format(new Date(selectedDialog.lastMessageAt))
                  : "—"}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold tracking-[-0.02em] text-slate-50">
                Сообщения диалога
              </h3>
              <p className="mt-1 text-sm text-slate-400">
                {selectedDialog
                  ? `${selectedDialog.messageCount} сообщений в диалоге`
                  : "Нет выбранного диалога"}
              </p>
            </div>
          </div>

          {selectedMessages.length > 0 ? (
            <div className="space-y-3">
              {selectedMessages.map((message) => (
                <article
                  key={`${message.telegram_chat_id}-${message.created_at}`}
                  className="rounded-[1.65rem] border border-slate-800 bg-[linear-gradient(180deg,rgba(2,6,23,0.7),rgba(15,23,42,0.66))] p-5 shadow-[0_10px_30px_rgba(2,6,23,0.26)]"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-[15px] font-semibold tracking-[-0.02em] text-slate-50">
                        {message.username || "Без username"}
                      </p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                        Telegram Message
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {dateFormatter.format(new Date(message.created_at))}
                    </p>
                  </div>
                  <p className="mt-4 whitespace-pre-wrap break-words text-[15px] leading-7 text-slate-300">
                    {message.text || "Пустое сообщение"}
                  </p>
                </article>
              ))}

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[1.2rem] border border-slate-800 bg-slate-950/65 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:gap-3 sm:rounded-[1.4rem]">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safeCurrentPage <= 1 || !selectedDialog}
                  className={`${secondaryButtonClassName} min-w-[104px] flex-1 sm:flex-none`}
                >
                  Назад
                </button>

                <span className="order-first w-full text-center text-sm font-medium text-slate-400 sm:order-none sm:w-auto">
                  {safeCurrentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={safeCurrentPage >= totalPages || !selectedDialog}
                  className={`${secondaryButtonClassName} min-w-[104px] flex-1 sm:flex-none`}
                >
                  Вперед
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-[1.6rem] border border-dashed border-slate-700 bg-slate-950/60 px-5 py-12 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <p className="text-sm font-medium text-slate-300">Сообщений пока нет</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Здесь появится история выбранного диалога.
              </p>
            </div>
          )}
        </div>
      </section>
    </section>
  );
}
