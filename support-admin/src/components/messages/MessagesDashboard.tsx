"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  closeDialogFormAction,
  releaseClientFromWorkFormAction,
  sendManagerMessageFormAction,
  takeClientInWorkFormAction,
} from "@/app/actions";
import { DialogListItem } from "@/components/messages/DialogListItem";
import { MessagesListener } from "@/features/messages/realtime/MessagesListener";
import type { ActionResult, DialogViewModel } from "@/types/message";

type MessagesDashboardProps = {
  currentUserId: string | null;
  dialogs: DialogViewModel[];
};

type DialogFilterId = "all" | "mine" | "unassigned" | "assignedToOthers";

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

const initialActionState: ActionResult = {
  error: null,
  success: null,
};

const MESSAGES_PER_PAGE = 5;

const secondaryButtonClassName =
  "rounded-lg border border-slate-700/90 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.76))] px-3 py-1.5 text-[12px] font-semibold text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-500/40 hover:bg-[linear-gradient(180deg,rgba(30,41,59,0.96),rgba(15,23,42,0.88))] hover:text-white hover:shadow-[0_8px_18px_rgba(2,132,199,0.1)] active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:translate-y-0 disabled:scale-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900/70 disabled:text-slate-500 disabled:shadow-none";

const compactButtonClassName =
  "rounded-full border border-slate-700/90 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.76))] px-3 py-1 text-[10px] font-semibold text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-500/40 hover:bg-[linear-gradient(180deg,rgba(30,41,59,0.96),rgba(15,23,42,0.88))] hover:text-white hover:shadow-[0_8px_18px_rgba(2,132,199,0.1)] active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:translate-y-0 disabled:scale-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900/70 disabled:text-slate-500 disabled:shadow-none";

const dialogFilters: Array<{ id: DialogFilterId; label: string }> = [
  { id: "all", label: "Все" },
  { id: "mine", label: "Мои" },
  { id: "unassigned", label: "Без менеджера" },
  { id: "assignedToOthers", label: "Назначены другим" },
];

function formatMessagePreview(text: string | null) {
  if (!text) {
    return "Пустое сообщение";
  }

  return text.length > 96 ? `${text.slice(0, 96)}...` : text;
}

function matchesDialogFilter(
  dialog: DialogViewModel,
  filterId: DialogFilterId,
  currentUserId: string | null,
): boolean {
  if (filterId === "all") {
    return true;
  }

  if (filterId === "mine") {
    return Boolean(currentUserId) && dialog.manager_auth_user_id === currentUserId;
  }

  if (filterId === "unassigned") {
    return !dialog.manager_auth_user_id;
  }

  return Boolean(dialog.manager_auth_user_id && currentUserId && dialog.manager_auth_user_id !== currentUserId);
}

function getManagerDisplayName(dialog: DialogViewModel | null): string {
  if (!dialog?.manager_auth_user_id) {
    return "Не назначен";
  }

  const fullName = [dialog.manager_first_name?.trim(), dialog.manager_last_name?.trim()]
    .filter(Boolean)
    .join(" ");

  return fullName || "Менеджер без имени";
}

function getOutgoingMessageLabel(dialog: DialogViewModel | null): string {
  const firstName = dialog?.manager_first_name?.trim();

  if (firstName) {
    return `Ответ менеджера ${firstName}`;
  }

  const displayName = getManagerDisplayName(dialog);

  if (displayName !== "Не назначен" && displayName !== "Менеджер без имени") {
    return `Ответ менеджера ${displayName}`;
  }

  return "Ответ менеджера";
}

function getClientStatus(
  dialog: DialogViewModel | null,
  currentUserId: string | null,
): { label: string; toneClassName: string; hint: string } {
  if (!dialog) {
    return {
      label: "Нет выбранного клиента",
      toneClassName: "border-slate-800 bg-slate-900/80 text-slate-300",
      hint: "Выберите диалог, чтобы посмотреть текущего ответственного.",
    };
  }

  if (!dialog.manager_auth_user_id) {
    return {
      label: "Без менеджера",
      toneClassName: "border-amber-500/30 bg-amber-500/10 text-amber-200",
      hint: "Клиент ожидает назначения в работу.",
    };
  }

  if (currentUserId && dialog.manager_auth_user_id === currentUserId) {
    return {
      label: "У вас в работе",
      toneClassName: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
      hint: "Вы можете отвечать клиенту и управлять диалогом.",
    };
  }

  return {
    label: "Назначен другому менеджеру",
    toneClassName: "border-sky-500/30 bg-sky-500/10 text-sky-200",
    hint: "Ответ и назначение ограничены текущим ответственным.",
  };
}

function getReplyAvailability(
  dialog: DialogViewModel | null,
  currentUserId: string | null,
): { canReply: boolean; hint: string } {
  if (!dialog) {
    return {
      canReply: false,
      hint: "Сначала выберите диалог.",
    };
  }

  if (!currentUserId) {
    return {
      canReply: false,
      hint: "Не удалось определить текущего менеджера.",
    };
  }

  if (!dialog.manager_auth_user_id) {
    return {
      canReply: false,
      hint: "Клиент еще не назначен. Сначала возьмите его в работу.",
    };
  }

  if (dialog.manager_auth_user_id !== currentUserId) {
    return {
      canReply: false,
      hint: "Отвечать можно только клиенту, назначенному текущему менеджеру.",
    };
  }

  return {
    canReply: true,
    hint: "Ответ будет отправлен клиенту от имени менеджера.",
  };
}

function getAssignmentAvailability(
  dialog: DialogViewModel | null,
  currentUserId: string | null,
): { canTake: boolean; hint: string; statusLabel: string } {
  if (!dialog) {
    return {
      canTake: false,
      hint: "Сначала выберите диалог.",
      statusLabel: "Нет выбранного клиента",
    };
  }

  if (!currentUserId) {
    return {
      canTake: false,
      hint: "Не удалось определить текущего менеджера.",
      statusLabel: "Менеджер не определен",
    };
  }

  if (!dialog.manager_auth_user_id) {
    return {
      canTake: true,
      hint: "Клиент пока не назначен. Можно взять его в работу.",
      statusLabel: "Клиент не назначен",
    };
  }

  if (dialog.manager_auth_user_id === currentUserId) {
    return {
      canTake: false,
      hint: "Этот клиент уже назначен вам.",
      statusLabel: "Уже у вас в работе",
    };
  }

  return {
    canTake: false,
    hint: "Клиент уже назначен другому менеджеру.",
    statusLabel: "Назначен другому менеджеру",
  };
}

function ActionMessage({ state }: { state: ActionResult }) {
  if (!state.error && !state.success) {
    return null;
  }

  const isSuccess = Boolean(state.success);

  return (
    <div
      className={`rounded-xl px-3 py-2 text-[13px] ${
        isSuccess
          ? "border border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
          : "border border-red-500/25 bg-red-500/10 text-red-200"
      }`}
    >
      {state.success ?? state.error}
    </div>
  );
}

export function MessagesDashboard({ currentUserId, dialogs }: MessagesDashboardProps) {
  const assignFormRef = useRef<HTMLFormElement>(null);
  const replyFormRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [assignState, assignAction, isAssigning] = useActionState(
    takeClientInWorkFormAction,
    initialActionState,
  );
  const [releaseState, releaseAction, isReleasing] = useActionState(
    releaseClientFromWorkFormAction,
    initialActionState,
  );
  const [closeState, closeAction, isClosing] = useActionState(
    closeDialogFormAction,
    initialActionState,
  );
  const [replyState, replyAction, isSending] = useActionState(
    sendManagerMessageFormAction,
    initialActionState,
  );
  const [activeFilter, setActiveFilter] = useState<DialogFilterId>("all");
  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChatId, setSelectedChatId] = useState<DialogViewModel["telegram_chat_id"] | null>(
    dialogs[0]?.telegram_chat_id ?? null,
  );
  const [currentPage, setCurrentPage] = useState(1);

  const closeActionsDropdown = () => setIsActionsDropdownOpen(false);

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredDialogs = useMemo(() => {
    return dialogs.filter((dialog) => {
      if (!matchesDialogFilter(dialog, activeFilter, currentUserId)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchableValues = [
        dialog.displayName.toLowerCase(),
        String(dialog.telegram_chat_id).toLowerCase(),
        dialog.lastMessageText?.toLowerCase() ?? "",
      ];

      return searchableValues.some((value) => value.includes(normalizedQuery));
    });
  }, [activeFilter, currentUserId, dialogs, normalizedQuery]);

  const selectedDialog =
    filteredDialogs.find((dialog) => dialog.telegram_chat_id === selectedChatId) ??
    filteredDialogs[0] ??
    null;
  const totalPages = Math.max(1, Math.ceil((selectedDialog?.messages.length ?? 0) / MESSAGES_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * MESSAGES_PER_PAGE;
  const selectedMessages =
    selectedDialog?.messages.slice(pageStartIndex, pageStartIndex + MESSAGES_PER_PAGE) ?? [];
  const displayedMessages = [...selectedMessages].reverse();
  const replyAvailability = getReplyAvailability(selectedDialog, currentUserId);
  const assignmentAvailability = getAssignmentAvailability(selectedDialog, currentUserId);
  const clientStatus = getClientStatus(selectedDialog, currentUserId);
  const isDialogAssigned = Boolean(selectedDialog?.manager_auth_user_id);
  const filterCounts: Record<DialogFilterId, number> = {
    all: dialogs.length,
    mine: dialogs.filter((dialog) => Boolean(currentUserId) && dialog.manager_auth_user_id === currentUserId).length,
    unassigned: dialogs.filter((dialog) => !dialog.manager_auth_user_id).length,
    assignedToOthers: dialogs.filter(
      (dialog) => Boolean(dialog.manager_auth_user_id && currentUserId && dialog.manager_auth_user_id !== currentUserId),
    ).length,
  };
  const incomingTotal = dialogs.reduce((total, dialog) => total + dialog.incomingMessages, 0);

  useEffect(() => {
    if (assignState.success) {
      assignFormRef.current?.reset();
      startTransition(() => router.refresh());
    }
  }, [assignState.success, router, startTransition]);

  useEffect(() => {
    if (releaseState.success) {
      startTransition(() => router.refresh());
    }
  }, [releaseState.success, router, startTransition]);

  useEffect(() => {
    if (closeState.success) {
      startTransition(() => router.refresh());
    }
  }, [closeState.success, router, startTransition]);

  useEffect(() => {
    if (replyState.success) {
      replyFormRef.current?.reset();
      startTransition(() => router.refresh());
    }
  }, [replyState.success, router, startTransition]);

  return (
    <>
      <MessagesListener />
      <section className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)]">
      <aside className="rounded-[1.1rem] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(2,6,23,0.9),rgba(15,23,42,0.8))] p-3.5 shadow-[0_16px_44px_rgba(2,6,23,0.34)] backdrop-blur sm:p-4 xl:sticky xl:top-4 xl:self-start">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800/90 pb-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
              Inbox
            </p>
            <h2 className="mt-1 text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-50">
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

        <div className="mt-3 grid grid-cols-3 gap-1.5">
          <div className="rounded-[0.75rem] border border-slate-800 bg-slate-950/55 px-2.5 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Всего</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-100">{dialogs.length}</p>
          </div>
          <div className="rounded-[0.75rem] border border-amber-500/20 bg-amber-500/10 px-2.5 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-amber-300/70">Входящие</p>
            <p className="mt-0.5 text-sm font-semibold text-amber-100">{incomingTotal}</p>
          </div>
          <div className="rounded-[0.75rem] border border-slate-800 bg-slate-950/55 px-2.5 py-2">
            <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-slate-600">Без mgr</p>
            <p className="mt-0.5 text-sm font-semibold text-slate-100">{filterCounts.unassigned}</p>
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
                  onClick={() => {
                    setActiveFilter(filter.id);
                    setCurrentPage(1);
                  }}
                  aria-pressed={isActive}
                  className={[
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
                    isActive
                      ? "border-sky-400/40 bg-sky-400/15 text-sky-100 shadow-[0_10px_24px_rgba(14,165,233,0.16)]"
                      : "border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-700 hover:text-slate-200",
                  ].join(" ")}
                >
                  <span>{filter.label}</span>
                  <span className={isActive ? "text-sky-100/75" : "text-slate-500"}>
                    {filterCounts[filter.id]}
                  </span>
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
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setCurrentPage(1);
              }}
              placeholder="Поиск по имени, chat ID или сообщению"
              className="w-full bg-transparent text-[13px] text-slate-100 placeholder:text-slate-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mt-3">
          <div className="space-y-2 overflow-y-auto pr-1 xl:max-h-[calc(100vh-18rem)] [scrollbar-color:#334155_transparent] [scrollbar-width:thin]">
            {filteredDialogs.length > 0 ? (
              filteredDialogs.map((dialog) => (
                <DialogListItem
                  assignedLabel={
                    !dialog.manager_auth_user_id
                      ? "Без менеджера"
                      : dialog.manager_auth_user_id === currentUserId
                        ? "У вас в работе"
                        : getManagerDisplayName(dialog)
                  }
                  key={String(dialog.telegram_chat_id)}
                  chatId={dialog.telegram_chat_id}
                  incomingCount={dialog.incomingMessages}
                  isActive={dialog.telegram_chat_id === selectedDialog?.telegram_chat_id}
                  lastMessageAt={dialog.lastMessageAt}
                  messageCount={dialog.messageCount}
                  onSelect={() => {
                    setSelectedChatId(dialog.telegram_chat_id);
                    setCurrentPage(1);
                    closeActionsDropdown();
                  }}
                  preview={formatMessagePreview(dialog.lastMessageText)}
                  statusTone={
                    !dialog.manager_auth_user_id
                      ? "unassigned"
                      : dialog.manager_auth_user_id === currentUserId
                        ? "mine"
                        : "assigned"
                  }
                  username={dialog.displayName}
                />
              ))
            ) : dialogs.length > 0 ? (
              <div className="rounded-[0.95rem] border border-dashed border-slate-700 bg-slate-950/60 px-4 py-7 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <p className="text-sm font-medium text-slate-300">Ничего не найдено</p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Попробуйте имя пользователя, chat ID или фрагмент последнего сообщения.
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

      <section className="rounded-[1.1rem] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(15,23,42,0.78))] p-3.5 shadow-[0_16px_44px_rgba(2,6,23,0.34)] backdrop-blur sm:p-4 xl:p-5">
        <div className="flex flex-col gap-3 border-b border-slate-900/70 pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="truncate text-[1.05rem] font-semibold tracking-[-0.03em] text-slate-100 sm:text-[1.15rem]">
              {selectedDialog?.displayName || "Выберите диалог"}
            </h2>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
              <span className="break-all font-mono">
                Chat ID: {selectedDialog ? selectedDialog.telegram_chat_id : "—"}
              </span>
              <span>
                Активность: {selectedDialog ? dateFormatter.format(new Date(selectedDialog.lastMessageAt)) : "—"}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            {!selectedDialog?.manager_auth_user_id ? (
              <form ref={assignFormRef} action={assignAction} className="contents">
                <input type="hidden" name="clientId" value={selectedDialog?.client_id ?? ""} />
                <button
                  type="submit"
                  disabled={!assignmentAvailability.canTake || isAssigning}
                  className={`${secondaryButtonClassName} min-w-[128px]`}
                >
                  {isAssigning ? "Назначение..." : "Взять в работу"}
                </button>
              </form>
            ) : null}

            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${clientStatus.toneClassName}`}
            >
              {clientStatus.label}
            </span>

            <div className="relative">
              <button
                type="button"
                aria-expanded={isActionsDropdownOpen}
                aria-label="Действия диалога"
                onClick={() => setIsActionsDropdownOpen((open) => !open)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700/90 bg-slate-950/70 text-lg leading-none text-slate-300 transition hover:border-slate-600 hover:bg-slate-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                ...
              </button>

              {isActionsDropdownOpen ? (
                <div className="absolute right-0 z-20 mt-2 w-56 rounded-[0.85rem] border border-slate-800 bg-slate-950/95 p-1.5 shadow-[0_18px_44px_rgba(2,6,23,0.42)]">
                  <form ref={!selectedDialog?.manager_auth_user_id ? undefined : assignFormRef} action={assignAction}>
                    <input type="hidden" name="clientId" value={selectedDialog?.client_id ?? ""} />
                    <button
                      type="submit"
                      onClick={closeActionsDropdown}
                      disabled={!assignmentAvailability.canTake || isAssigning}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] font-medium text-slate-200 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:text-slate-600"
                    >
                      Взять в работу
                    </button>
                  </form>
                  <form action={releaseAction}>
                    <input type="hidden" name="clientId" value={selectedDialog?.client_id ?? ""} />
                    <button
                      type="submit"
                      onClick={closeActionsDropdown}
                      disabled={!isDialogAssigned || isReleasing}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] font-medium text-slate-200 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:text-slate-600"
                    >
                      {isReleasing ? "Снятие..." : "Снять с работы"}
                    </button>
                  </form>
                  <button
                    type="button"
                    disabled
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] font-medium text-slate-600"
                  >
                    Назначить менеджера
                  </button>
                  <form action={closeAction}>
                    <input type="hidden" name="clientId" value={selectedDialog?.client_id ?? ""} />
                    <button
                      type="submit"
                      onClick={closeActionsDropdown}
                      disabled={!selectedDialog || isClosing}
                      className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] font-medium text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:text-slate-600"
                    >
                      {isClosing ? "Закрытие..." : "Закрыть диалог"}
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-3">
          <ActionMessage state={assignState} />
          <ActionMessage state={releaseState} />
          <ActionMessage state={closeState} />

          {selectedMessages.length > 0 ? (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-[0.85rem] border border-slate-800 bg-slate-950/65 px-2.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:gap-2.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={safeCurrentPage <= 1 || !selectedDialog}
                  className={`${secondaryButtonClassName} min-w-[104px] flex-1 sm:flex-none`}
                >
                  Назад
                </button>

                <span className="order-first w-full text-center text-[13px] font-medium text-slate-400 sm:order-none sm:w-auto">
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

              {displayedMessages.map((message) => {
                const isManagerMessage = message.direction === "outgoing";

                return (
                  <article
                    key={`${message.telegram_chat_id}-${message.created_at}`}
                    className={[
                      "w-full max-w-[78%] rounded-[0.75rem] border px-3 py-2 shadow-[0_6px_16px_rgba(2,6,23,0.18)] sm:max-w-[64%]",
                      isManagerMessage
                        ? "ml-auto border-sky-500/25 bg-[linear-gradient(180deg,rgba(8,47,73,0.68),rgba(15,23,42,0.82))]"
                        : "mr-auto border-slate-800 bg-[linear-gradient(180deg,rgba(2,6,23,0.72),rgba(15,23,42,0.66))]",
                    ].join(" ")}
                  >
                    <div
                      className={[
                        "flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between",
                        isManagerMessage ? "sm:flex-row-reverse sm:text-right" : "",
                      ].join(" ")}
                    >
                      <div>
                        <p className="truncate text-[12px] font-semibold tracking-[-0.02em] text-slate-50">
                          {isManagerMessage
                            ? getOutgoingMessageLabel(selectedDialog)
                            : message.username || "Без username"}
                        </p>
                      </div>
                      <p className="shrink-0 text-[10px] text-slate-500">
                        {dateFormatter.format(new Date(message.sent_at ?? message.created_at))}
                      </p>
                    </div>
                    <p
                      className={[
                        "mt-1.5 whitespace-pre-wrap break-words text-[12px] leading-5",
                        isManagerMessage ? "text-sky-50/90" : "text-slate-300",
                      ].join(" ")}
                    >
                      {message.text || "Пустое сообщение"}
                    </p>
                  </article>
                );
              })}

            </div>
          ) : (
            <div className="rounded-[0.95rem] border border-dashed border-slate-700 bg-slate-950/60 px-4 py-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <p className="text-sm font-medium text-slate-300">Сообщений пока нет</p>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                Здесь появится история выбранного диалога.
              </p>
            </div>
          )}

          <form
            ref={replyFormRef}
            action={replyAction}
            className="rounded-[0.95rem] border border-slate-800 bg-slate-950/55 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
          >
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-2.5">
                <div>
                  <p className="text-[13px] font-semibold text-slate-100">Ответ менеджера</p>
                  <p className="mt-0.5 text-[12px] text-slate-400">{replyAvailability.hint}</p>
                </div>
              </div>

              <ActionMessage state={replyState} />

              <input type="hidden" name="clientId" value={selectedDialog?.client_id ?? ""} />
              <textarea
                name="text"
                rows={3}
                disabled={!replyAvailability.canReply || isSending}
                placeholder="Введите текст ответа"
                className="w-full resize-y rounded-[0.85rem] border border-slate-800 bg-slate-950/80 px-3 py-2 text-[13px] text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-400/60 disabled:cursor-not-allowed disabled:text-slate-500"
              />

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={!replyAvailability.canReply || isSending}
                  className={`${secondaryButtonClassName} min-w-[140px]`}
                >
                  {isSending ? "Отправка..." : "Отправить"}
                </button>
              </div>
            </div>
          </form>
        </div>
      </section>
      </section>
    </>
  );
}
