import { DialogListItem } from "@/components/messages/DialogListItem";
import type { DialogViewModel } from "@/types/message";
import type { DialogFilterId, DialogListItemViewModel } from "@/features/messages/model/messagesDashboard";
import { compactButtonClassName, dialogFilters } from "@/features/messages/model/messagesDashboardConstants";

type DialogsSidebarProps = {
  activeFilter: DialogFilterId;
  dialogs: DialogViewModel[];
  displayedDialogs: DialogListItemViewModel[];
  filterCounts: Record<DialogFilterId, number>;
  incomingTotal: number;
  isRefreshing: boolean;
  onFilterChange: (filterId: DialogFilterId) => void;
  onRefresh: () => void;
  onSearchChange: (query: string) => void;
  onSelectDialog: (telegramChatId: DialogViewModel["telegram_chat_id"]) => void;
  searchQuery: string;
  selectedChatId: DialogViewModel["telegram_chat_id"] | null;
};

export function DialogsSidebar({
  activeFilter,
  dialogs,
  displayedDialogs,
  filterCounts,
  incomingTotal,
  isRefreshing,
  onFilterChange,
  onRefresh,
  onSearchChange,
  onSelectDialog,
  searchQuery,
  selectedChatId,
}: DialogsSidebarProps) {
  const openDialogs = dialogs.filter((dialog) => !dialog.isClosed);
  const closedDialogs = dialogs.filter((dialog) => dialog.isClosed);

  return (
    <aside className="rounded-[1.1rem] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(2,6,23,0.9),rgba(15,23,42,0.8))] p-3.5 shadow-[0_16px_44px_rgba(2,6,23,0.34)] backdrop-blur sm:p-4 xl:sticky xl:top-4 xl:self-start">
      <div className="flex items-start justify-between gap-3 border-b border-slate-800/90 pb-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">Inbox</p>
          <h2 className="mt-1 text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-50">Диалоги</h2>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full border border-slate-800 bg-slate-900/90 px-3 py-1 text-[11px] font-semibold text-slate-400">
            {displayedDialogs.length}
          </span>
          <button type="button" onClick={onRefresh} disabled={isRefreshing} className={compactButtonClassName}>
            {isRefreshing ? "Обновление..." : "Обновить"}
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5">
        <div className="rounded-[0.75rem] border border-slate-800 bg-slate-950/55 px-2.5 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Активные</p>
          <p className="mt-0.5 text-sm font-semibold text-slate-100">{openDialogs.length}</p>
        </div>
        <div className="rounded-[0.75rem] border border-amber-500/20 bg-amber-500/10 px-2.5 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-amber-300/70">Входящие</p>
          <p className="mt-0.5 text-sm font-semibold text-amber-100">{incomingTotal}</p>
        </div>
        <div className="rounded-[0.75rem] border border-violet-500/20 bg-violet-500/10 px-2.5 py-2">
          <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-violet-300/70">Закрытые</p>
          <p className="mt-0.5 text-sm font-semibold text-violet-100">{closedDialogs.length}</p>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex flex-wrap gap-1.5">
          {dialogFilters.map((filter) => {
            const isActive = filter.id === activeFilter;

            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => onFilterChange(filter.id)}
                aria-pressed={isActive}
                className={[
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
                  isActive
                    ? "border-sky-400/40 bg-sky-400/15 text-sky-100 shadow-[0_10px_24px_rgba(14,165,233,0.16)]"
                    : "border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-700 hover:text-slate-200",
                ].join(" ")}
              >
                <span>{filter.label}</span>
                <span className={isActive ? "text-sky-100/75" : "text-slate-500"}>{filterCounts[filter.id]}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3">
        <label className="sr-only" htmlFor="dialogs-search">
          Поиск по диалогам
        </label>
        <div className="rounded-[0.85rem] border border-slate-800 bg-slate-950/75 px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
          <input
            id="dialogs-search"
            type="search"
            value={searchQuery}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Поиск по имени, chat ID, причине или комментарию"
            className="w-full bg-transparent text-[13px] text-slate-100 placeholder:text-slate-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="mt-3">
        <div className="space-y-2 overflow-y-auto pr-1 xl:max-h-[calc(100vh-18rem)] [scrollbar-color:#334155_transparent] [scrollbar-width:thin]">
          {displayedDialogs.length > 0 ? (
            displayedDialogs.map(({ assignedLabel, dialog, preview, statusTone }) => (
              <DialogListItem
                assignedLabel={assignedLabel}
                key={String(dialog.telegram_chat_id)}
                chatId={dialog.telegram_chat_id}
                incomingCount={dialog.incomingMessages}
                isActive={dialog.telegram_chat_id === selectedChatId}
                lastMessageAt={dialog.lastMessageAt}
                messageCount={dialog.messageCount}
                priority={dialog.aiInteractionPriority}
                onSelect={() => onSelectDialog(dialog.telegram_chat_id)}
                preview={preview}
                statusTone={statusTone}
                username={dialog.displayName}
              />
            ))
          ) : dialogs.length > 0 ? (
            <div className="rounded-[0.95rem] border border-dashed border-slate-700 bg-slate-950/60 px-4 py-7 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <p className="text-sm font-medium text-slate-300">Ничего не найдено</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Попробуйте имя пользователя, chat ID или причину закрытия.
              </p>
            </div>
          ) : (
            <div className="rounded-[0.95rem] border border-dashed border-slate-700 bg-slate-950/60 px-4 py-7 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <p className="text-sm font-medium text-slate-300">Диалогов пока нет</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Список появится, когда в базе будут сохранены сообщения.
              </p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
