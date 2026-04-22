"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  assignClientToManagerFormAction,
  sendManagerMessageFormAction,
  takeClientInWorkFormAction,
} from "@/app/actions";
import { DialogListItem } from "@/components/messages/DialogListItem";
import { MessagesListener } from "@/features/messages/realtime/MessagesListener";
import type { ActionResult, DialogViewModel, ManagerSummary } from "@/types/message";

type MessagesDashboardProps = {
  currentUserId: string | null;
  dialogs: DialogViewModel[];
  managers: ManagerSummary[];
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
  "rounded-xl border border-slate-700/90 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.76))] px-3.5 py-2 text-[13px] font-semibold text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-500/40 hover:bg-[linear-gradient(180deg,rgba(30,41,59,0.96),rgba(15,23,42,0.88))] hover:text-white hover:shadow-[0_12px_24px_rgba(2,132,199,0.12)] active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:translate-y-0 disabled:scale-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900/70 disabled:text-slate-500 disabled:shadow-none";

const compactButtonClassName =
  "rounded-full border border-slate-700/90 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.76))] px-3.5 py-1.5 text-[11px] font-semibold text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-500/40 hover:bg-[linear-gradient(180deg,rgba(30,41,59,0.96),rgba(15,23,42,0.88))] hover:text-white hover:shadow-[0_12px_24px_rgba(2,132,199,0.12)] active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:translate-y-0 disabled:scale-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900/70 disabled:text-slate-500 disabled:shadow-none";

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

function getManagerOptionLabel(manager: ManagerSummary): string {
  const fullName = [manager.first_name?.trim(), manager.last_name?.trim()].filter(Boolean).join(" ");

  if (fullName && manager.company_role) {
    return `${fullName} (${manager.company_role})`;
  }

  if (fullName) {
    return fullName;
  }

  if (manager.email && manager.company_role) {
    return `${manager.email} (${manager.company_role})`;
  }

  return manager.email ?? `Менеджер #${manager.id}`;
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
      className={`rounded-2xl px-4 py-3 text-sm ${
        isSuccess
          ? "border border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
          : "border border-red-500/25 bg-red-500/10 text-red-200"
      }`}
    >
      {state.success ?? state.error}
    </div>
  );
}

export function MessagesDashboard({ currentUserId, dialogs, managers }: MessagesDashboardProps) {
  const assignFormRef = useRef<HTMLFormElement>(null);
  const reassignFormRef = useRef<HTMLFormElement>(null);
  const replyFormRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [assignState, assignAction, isAssigning] = useActionState(
    takeClientInWorkFormAction,
    initialActionState,
  );
  const [reassignState, reassignAction, isReassigning] = useActionState(
    assignClientToManagerFormAction,
    initialActionState,
  );
  const [replyState, replyAction, isSending] = useActionState(
    sendManagerMessageFormAction,
    initialActionState,
  );
  const [activeFilter, setActiveFilter] = useState<DialogFilterId>("all");
  const [isActionsMenuOpen, setIsActionsMenuOpen] = useState(false);
  const [isAssignSectionOpen, setIsAssignSectionOpen] = useState(false);
  const [isReassignSectionOpen, setIsReassignSectionOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChatId, setSelectedChatId] = useState<DialogViewModel["telegram_chat_id"] | null>(
    dialogs[0]?.telegram_chat_id ?? null,
  );
  const [currentPage, setCurrentPage] = useState(1);

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
  const replyAvailability = getReplyAvailability(selectedDialog, currentUserId);
  const assignmentAvailability = getAssignmentAvailability(selectedDialog, currentUserId);
  const clientStatus = getClientStatus(selectedDialog, currentUserId);
  const assignedManagerName = getManagerDisplayName(selectedDialog);
  const reassignableManagers = managers.filter((manager) => manager.id !== selectedDialog?.current_manager_id);

  useEffect(() => {
    if (assignState.success) {
      assignFormRef.current?.reset();
      startTransition(() => router.refresh());
    }
  }, [assignState.success, router, startTransition]);

  useEffect(() => {
    if (reassignState.success) {
      reassignFormRef.current?.reset();
      startTransition(() => router.refresh());
    }
  }, [reassignState.success, router, startTransition]);

  useEffect(() => {
    if (replyState.success) {
      replyFormRef.current?.reset();
      startTransition(() => router.refresh());
    }
  }, [replyState.success, router, startTransition]);

  return (
    <>
      <MessagesListener />
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
          <div className="flex flex-wrap gap-2">
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
                    "rounded-full border px-3 py-1.5 text-[11px] font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
                    isActive
                      ? "border-sky-400/40 bg-sky-400/15 text-sky-100 shadow-[0_10px_24px_rgba(14,165,233,0.16)]"
                      : "border-slate-800 bg-slate-950/70 text-slate-400 hover:border-slate-700 hover:text-slate-200",
                  ].join(" ")}
                >
                  {filter.label}
                </button>
              );
            })}
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
                    setIsActionsMenuOpen(false);
                    setIsAssignSectionOpen(false);
                    setIsReassignSectionOpen(false);
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
                {selectedDialog ? dateFormatter.format(new Date(selectedDialog.lastMessageAt)) : "—"}
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
            <button
              type="button"
              onClick={() =>
                setIsActionsMenuOpen((open) => {
                  const nextOpen = !open;

                  if (!nextOpen) {
                    setIsAssignSectionOpen(false);
                    setIsReassignSectionOpen(false);
                  }

                  return nextOpen;
                })
              }
              className={`${secondaryButtonClassName} inline-flex min-w-[168px] items-center justify-center gap-2`}
            >
              <span aria-hidden="true" className="text-sm leading-none">
                {isActionsMenuOpen ? "x" : "|||"}
              </span>
              {isActionsMenuOpen ? "Скрыть меню" : "Меню диалога"}
            </button>
          </div>

          {isActionsMenuOpen ? (
            <div className="space-y-4 rounded-[1.5rem] border border-slate-800/90 bg-[linear-gradient(180deg,rgba(2,6,23,0.72),rgba(15,23,42,0.6))] p-3 sm:p-4">
              <section className="rounded-[1.5rem] border border-slate-800 bg-slate-950/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-100">Ответственный менеджер</p>
                    <p className="mt-1 text-sm text-slate-400">{clientStatus.hint}</p>
                  </div>
                  <span
                    className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${clientStatus.toneClassName}`}
                  >
                    {clientStatus.label}
                  </span>
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
                  <div className="rounded-[1rem] border border-slate-800/90 bg-slate-950/70 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Менеджер
                    </p>
                    <p className="mt-2 truncate text-sm font-semibold text-slate-100">
                      {assignedManagerName}
                    </p>
                  </div>

                  <div className="rounded-[1rem] border border-slate-800/90 bg-slate-950/70 px-4 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Роль
                    </p>
                    <p className="mt-2 text-sm text-slate-300">
                      {selectedDialog?.manager_company_role || "Не указана"}
                    </p>
                  </div>
                </div>
              </section>

              <section className="rounded-[1.2rem] border border-slate-800 bg-slate-950/55 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <button
                  type="button"
                  onClick={() => setIsAssignSectionOpen((open) => !open)}
                  className="flex w-full items-center justify-between gap-3 rounded-[0.9rem] px-1 py-1 text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-100">Назначение клиента</p>
                    <p className="mt-1 text-sm text-slate-400">{assignmentAvailability.statusLabel}</p>
                  </div>
                  <span className="text-slate-400">{isAssignSectionOpen ? "-" : "+"}</span>
                </button>

                {isAssignSectionOpen ? (
                  <form
                    ref={assignFormRef}
                    action={assignAction}
                    className="mt-3 rounded-[1.2rem] border border-slate-800 bg-slate-950/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-100">Назначение клиента</p>
                          <p className="mt-1 text-sm text-slate-400">{assignmentAvailability.hint}</p>
                        </div>
                        <span className="rounded-full border border-slate-800 bg-slate-900/80 px-3 py-1 text-[11px] font-semibold text-slate-300">
                          {assignmentAvailability.statusLabel}
                        </span>
                      </div>

                      <ActionMessage state={assignState} />

                      <input type="hidden" name="clientId" value={selectedDialog?.client_id ?? ""} />

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={!assignmentAvailability.canTake || isAssigning}
                          className={`${secondaryButtonClassName} min-w-[160px]`}
                        >
                          {isAssigning ? "Назначение..." : "Взять в работу"}
                        </button>
                      </div>
                    </div>
                  </form>
                ) : null}
              </section>

              <section className="rounded-[1.2rem] border border-slate-800 bg-slate-950/55 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                <button
                  type="button"
                  onClick={() => setIsReassignSectionOpen((open) => !open)}
                  className="flex w-full items-center justify-between gap-3 rounded-[0.9rem] px-1 py-1 text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-100">Переназначение клиента</p>
                    <p className="mt-1 text-sm text-slate-400">
                      {reassignableManagers.length > 0
                        ? `Доступно менеджеров: ${reassignableManagers.length}`
                        : "Нет доступных менеджеров"}
                    </p>
                  </div>
                  <span className="text-slate-400">{isReassignSectionOpen ? "-" : "+"}</span>
                </button>

                {isReassignSectionOpen ? (
                  <form
                    ref={reassignFormRef}
                    action={reassignAction}
                    className="mt-3 rounded-[1.2rem] border border-slate-800 bg-slate-950/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
                  >
                    <div className="flex flex-col gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-100">Переназначение клиента</p>
                        <p className="mt-1 text-sm text-slate-400">
                          Выберите менеджера и, при необходимости, укажите причину переназначения.
                        </p>
                      </div>

                      <ActionMessage state={reassignState} />

                      <input type="hidden" name="clientId" value={selectedDialog?.client_id ?? ""} />

                      <label className="flex flex-col gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Новый менеджер
                        </span>
                        <select
                          name="newManagerId"
                          defaultValue=""
                          disabled={!selectedDialog || reassignableManagers.length === 0 || isReassigning}
                          className="rounded-[1rem] border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition focus:border-sky-400/60 disabled:cursor-not-allowed disabled:text-slate-500"
                        >
                          <option value="" disabled>
                            Выберите менеджера
                          </option>
                          {reassignableManagers.map((manager) => (
                            <option key={manager.id} value={manager.id}>
                              {getManagerOptionLabel(manager)}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="flex flex-col gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                          Причина
                        </span>
                        <textarea
                          name="reassignmentReason"
                          rows={3}
                          disabled={!selectedDialog || isReassigning}
                          placeholder="Например: смена ответственного, перераспределение нагрузки, отпуск"
                          className="w-full resize-y rounded-[1.2rem] border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-400/60 disabled:cursor-not-allowed disabled:text-slate-500"
                        />
                      </label>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          disabled={!selectedDialog || reassignableManagers.length === 0 || isReassigning}
                          className={`${secondaryButtonClassName} min-w-[180px]`}
                        >
                          {isReassigning ? "Переназначение..." : "Переназначить"}
                        </button>
                      </div>
                    </div>
                  </form>
                ) : null}
              </section>
            </div>
          ) : null}

          <form
            ref={replyFormRef}
            action={replyAction}
            className="rounded-[1.5rem] border border-slate-800 bg-slate-950/55 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]"
          >
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-100">Ответ менеджера</p>
                  <p className="mt-1 text-sm text-slate-400">{replyAvailability.hint}</p>
                </div>
              </div>

              <ActionMessage state={replyState} />

              <input type="hidden" name="clientId" value={selectedDialog?.client_id ?? ""} />
              <textarea
                name="text"
                rows={4}
                disabled={!replyAvailability.canReply || isSending}
                placeholder="Введите текст ответа"
                className="w-full resize-y rounded-[1.2rem] border border-slate-800 bg-slate-950/80 px-4 py-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-400/60 disabled:cursor-not-allowed disabled:text-slate-500"
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
                        {message.direction === "outgoing"
                          ? getOutgoingMessageLabel(selectedDialog)
                          : message.username || "Без username"}
                      </p>
                      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
                        {message.direction === "outgoing" ? "Исходящее сообщение" : "Telegram Message"}
                      </p>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      {dateFormatter.format(new Date(message.sent_at ?? message.created_at))}
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
    </>
  );
}
