"use client";

import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  assignClientToManagerFormAction,
  closeDialogFormAction,
  releaseClientFromWorkFormAction,
  reopenDialogFormAction,
  sendManagerMessageFormAction,
} from "@/app/actions";
import { DialogListItem } from "@/components/messages/DialogListItem";
import { PriorityBadge } from "@/components/messages/PriorityBadge";
import { useToast } from "@/components/ui/ToastProvider";
import { MessagesListener } from "@/features/messages/realtime/MessagesListener";
import type { ActionResult, DialogViewModel, ManagerSummary, Message } from "@/types/message";

type MessagesDashboardProps = {
  currentManagerId: number | null;
  currentUserId: string | null;
  dialogs: DialogViewModel[];
  managers?: ManagerSummary[];
};

type DialogFilterId = "all" | "mine" | "unassigned" | "assignedToOthers" | "closed";

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
  { id: "closed", label: "Закрытые" },
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
  const isClosed = Boolean(dialog.isClosed);

  if (filterId === "closed") {
    return isClosed;
  }

  if (isClosed) {
    return false;
  }

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

  const fullName = [dialog.manager_first_name?.trim(), dialog.manager_last_name?.trim()].filter(Boolean).join(" ");

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

function getManagerNameBySummary(manager: ManagerSummary | undefined): string | null {
  if (!manager) {
    return null;
  }

  const fullName = [manager.first_name?.trim(), manager.last_name?.trim()].filter(Boolean).join(" ");

  return fullName || manager.email?.trim() || `Manager #${manager.id}`;
}

function getManagerNameParts(manager: ManagerSummary): {
  fallbackLabel: string;
  fullName: string;
  hasCompleteName: boolean;
} {
  const firstName = manager.first_name?.trim() ?? "";
  const lastName = manager.last_name?.trim() ?? "";
  const fullName = [firstName, lastName].filter(Boolean).join(" ");

  return {
    fallbackLabel: manager.email?.trim() || `Manager #${manager.id}`,
    fullName,
    hasCompleteName: Boolean(firstName && lastName),
  };
}

function getManagerOptionLabel(
  manager: ManagerSummary,
  fullNameCounts: Map<string, number>,
): string {
  const { fallbackLabel, fullName, hasCompleteName } = getManagerNameParts(manager);

  if (!fullName) {
    return fallbackLabel;
  }

  const shouldShowFallback = !hasCompleteName || (fullNameCounts.get(fullName) ?? 0) > 1;

  return shouldShowFallback ? `${fullName} (${fallbackLabel})` : fullName;
}

function getOutgoingMessageAuthorLabel(message: Message, managersById: Map<number, ManagerSummary>): string {
  if (message.manager_id) {
    const managerName = getManagerNameBySummary(managersById.get(message.manager_id));

    if (managerName) {
      return `Ответ менеджера ${managerName}`;
    }
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

  if (dialog.isClosed) {
    return {
      label: "Закрыт",
      toneClassName: "border-violet-500/30 bg-violet-500/10 text-violet-200",
      hint: "Диалог закрыт и находится в архиве.",
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

  if (dialog.isClosed) {
    return {
      canReply: false,
      hint: "Закрытый диалог нельзя отвечать, пока он не переоткрыт.",
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
): { canTake: boolean; hint: string } {
  if (!dialog) {
    return {
      canTake: false,
      hint: "Сначала выберите диалог.",
    };
  }

  if (dialog.isClosed) {
    return {
      canTake: false,
      hint: "Закрытый диалог сначала нужно переоткрыть.",
    };
  }

  if (!currentUserId) {
    return {
      canTake: false,
      hint: "Не удалось определить текущего менеджера.",
    };
  }

  if (!dialog.manager_auth_user_id) {
    return {
      canTake: true,
      hint: "Клиент пока не назначен. Можно взять его в работу.",
    };
  }

  if (dialog.manager_auth_user_id === currentUserId) {
    return {
      canTake: false,
      hint: "Этот клиент уже назначен вам.",
    };
  }

  return {
    canTake: false,
    hint: "Клиент уже назначен другому менеджеру.",
  };
}

function getReleaseAvailability(
  dialog: DialogViewModel | null,
  currentUserId: string | null,
): { canRelease: boolean; hint: string } {
  if (!dialog) {
    return {
      canRelease: false,
      hint: "Сначала выберите диалог.",
    };
  }

  if (dialog.isClosed) {
    return {
      canRelease: false,
      hint: "Закрытый диалог уже выведен из работы.",
    };
  }

  if (!currentUserId) {
    return {
      canRelease: false,
      hint: "Не удалось определить текущего менеджера.",
    };
  }

  if (!dialog.manager_auth_user_id) {
    return {
      canRelease: false,
      hint: "Диалог уже не находится в работе.",
    };
  }

  if (dialog.manager_auth_user_id !== currentUserId) {
    return {
      canRelease: false,
      hint: "Снять с работы можно только свой диалог.",
    };
  }

  return {
    canRelease: true,
    hint: "Диалог будет снят с вашей работы.",
  };
}

function getCloseAvailability(
  dialog: DialogViewModel | null,
  currentUserId: string | null,
): { canClose: boolean; hint: string } {
  if (!dialog) {
    return {
      canClose: false,
      hint: "Сначала выберите диалог.",
    };
  }

  if (dialog.isClosed) {
    return {
      canClose: false,
      hint: "Диалог уже закрыт.",
    };
  }

  if (!currentUserId) {
    return {
      canClose: false,
      hint: "Не удалось определить текущего менеджера.",
    };
  }

  if (!dialog.manager_auth_user_id) {
    return {
      canClose: false,
      hint: "Закрывать можно только диалог, который взят в работу.",
    };
  }

  if (dialog.manager_auth_user_id !== currentUserId) {
    return {
      canClose: false,
      hint: "Закрывать можно только свой диалог.",
    };
  }

  return {
    canClose: true,
    hint: "Диалог будет закрыт, снят с менеджера и перенесен в архив.",
  };
}

function getReopenAvailability(dialog: DialogViewModel | null): { canReopen: boolean; hint: string } {
  if (!dialog) {
    return {
      canReopen: false,
      hint: "Сначала выберите диалог.",
    };
  }

  if (!dialog.isClosed) {
    return {
      canReopen: false,
      hint: "Переоткрыть можно только закрытый диалог.",
    };
  }

  return {
    canReopen: true,
    hint: "Диалог вернется в общую очередь без назначенного менеджера.",
  };
}

export function MessagesDashboard({
  currentManagerId,
  currentUserId,
  dialogs,
  managers = [],
}: MessagesDashboardProps) {
  const assignmentFormRef = useRef<HTMLFormElement>(null);
  const replyFormRef = useRef<HTMLFormElement>(null);
  const closeFormRef = useRef<HTMLFormElement>(null);
  const router = useRouter();
  const { showToast } = useToast();
  const [isRefreshing, startTransition] = useTransition();
  const [assignState, assignAction, isAssigning] = useActionState(
    assignClientToManagerFormAction,
    initialActionState,
  );
  const [releaseState, releaseAction, isReleasing] = useActionState(
    releaseClientFromWorkFormAction,
    initialActionState,
  );
  const [closeState, closeAction, isClosing] = useActionState(closeDialogFormAction, initialActionState);
  const [reopenState, reopenAction, isReopening] = useActionState(reopenDialogFormAction, initialActionState);
  const [replyState, replyAction, isSending] = useActionState(sendManagerMessageFormAction, initialActionState);
  const [activeFilter, setActiveFilter] = useState<DialogFilterId>("all");
  const [isActionsDropdownOpen, setIsActionsDropdownOpen] = useState(false);
  const [isCloseModalOpen, setIsCloseModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedChatId, setSelectedChatId] = useState<DialogViewModel["telegram_chat_id"] | null>(
    dialogs.find((dialog) => !dialog.isClosed)?.telegram_chat_id ?? dialogs[0]?.telegram_chat_id ?? null,
  );
  const [currentPage, setCurrentPage] = useState(1);

  const closeActionsDropdown = () => setIsActionsDropdownOpen(false);
  const closeCloseModal = () => setIsCloseModalOpen(false);
  const managersById = useMemo(() => new Map(managers.map((manager) => [manager.id, manager])), [managers]);
  const managerFullNameCounts = useMemo(() => {
    const counts = new Map<string, number>();

    for (const manager of managers) {
      const { fullName } = getManagerNameParts(manager);

      if (!fullName) {
        continue;
      }

      counts.set(fullName, (counts.get(fullName) ?? 0) + 1);
    }

    return counts;
  }, [managers]);

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
        dialog.closeReason?.toLowerCase() ?? "",
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
  const releaseAvailability = getReleaseAvailability(selectedDialog, currentUserId);
  const closeAvailability = getCloseAvailability(selectedDialog, currentUserId);
  const reopenAvailability = getReopenAvailability(selectedDialog);
  const clientStatus = getClientStatus(selectedDialog, currentUserId);
  const currentAssignedManagerId = selectedDialog?.current_manager_id ?? null;
  const assignableManagers = managers
    .filter((manager) => manager.id !== currentAssignedManagerId)
    .map((manager) => ({
      id: manager.id,
      label: getManagerOptionLabel(manager, managerFullNameCounts),
    }));
  const canAssignDialog = Boolean(selectedDialog && !selectedDialog.isClosed);
  const assignmentHint = !selectedDialog
    ? "Сначала выберите диалог."
    : selectedDialog.isClosed
      ? "Закрытый диалог сначала нужно переоткрыть."
      : assignableManagers.length === 0
        ? "Нет доступных менеджеров для назначения."
        : "Выберите менеджера и назначьте диалог.";
  const openDialogs = dialogs.filter((dialog) => !dialog.isClosed);
  const closedDialogs = dialogs.filter((dialog) => dialog.isClosed);
  const filterCounts: Record<DialogFilterId, number> = {
    all: openDialogs.length,
    mine: openDialogs.filter((dialog) => Boolean(currentUserId) && dialog.manager_auth_user_id === currentUserId).length,
    unassigned: openDialogs.filter((dialog) => !dialog.manager_auth_user_id).length,
    assignedToOthers: openDialogs.filter(
      (dialog) => Boolean(dialog.manager_auth_user_id && currentUserId && dialog.manager_auth_user_id !== currentUserId),
    ).length,
    closed: closedDialogs.length,
  };
  const incomingTotal = openDialogs.reduce((total, dialog) => total + dialog.incomingMessages, 0);

  useEffect(() => {
    if (assignState.success) {
      showToast(assignState.success);
      assignmentFormRef.current?.reset();
      startTransition(() => router.refresh());
    }
  }, [assignState, router, showToast, startTransition]);

  useEffect(() => {
    if (assignState.error) {
      showToast(assignState.error, "error");
    }
  }, [assignState, showToast]);

  useEffect(() => {
    if (releaseState.success) {
      showToast(releaseState.success);
      startTransition(() => router.refresh());
    }
  }, [releaseState, router, showToast, startTransition]);

  useEffect(() => {
    if (releaseState.error) {
      showToast(releaseState.error, "error");
    }
  }, [releaseState, showToast]);

  useEffect(() => {
    if (closeState.success) {
      showToast(closeState.success);
      closeFormRef.current?.reset();
      startTransition(() => {
        setIsCloseModalOpen(false);
        setIsActionsDropdownOpen(false);
        router.refresh();
      });
    }
  }, [closeState, router, showToast, startTransition]);

  useEffect(() => {
    if (closeState.error) {
      showToast(closeState.error, "error");
    }
  }, [closeState, showToast]);

  useEffect(() => {
    if (reopenState.success) {
      showToast(reopenState.success);
      startTransition(() => {
        setIsActionsDropdownOpen(false);
        router.refresh();
      });
    }
  }, [reopenState, router, showToast, startTransition]);

  useEffect(() => {
    if (reopenState.error) {
      showToast(reopenState.error, "error");
    }
  }, [reopenState, showToast]);

  useEffect(() => {
    if (replyState.success) {
      showToast(replyState.success);
      replyFormRef.current?.reset();
      startTransition(() => router.refresh());
    }
  }, [replyState, router, showToast, startTransition]);

  useEffect(() => {
    if (replyState.error) {
      showToast(replyState.error, "error");
    }
  }, [replyState, showToast]);

  return (
    <>
      <MessagesListener />

      {isCloseModalOpen && selectedDialog ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 px-3 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[1.2rem] border border-slate-800 bg-[linear-gradient(180deg,rgba(2,6,23,0.98),rgba(15,23,42,0.96))] p-4 shadow-[0_24px_70px_rgba(2,6,23,0.48)] sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
                  Close Dialog
                </p>
                <h3 className="mt-1 text-lg font-semibold text-slate-50">Закрыть диалог</h3>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  После подтверждения диалог будет снят с менеджера и перенесен в раздел закрытых.
                </p>
              </div>

              <button
                type="button"
                onClick={closeCloseModal}
                className="rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 py-1 text-sm text-slate-300 transition hover:border-slate-700 hover:text-white"
              >
                Закрыть
              </button>
            </div>

            <form ref={closeFormRef} action={closeAction} className="mt-4 space-y-3">
              <input type="hidden" name="clientId" value={selectedDialog.client_id} />
              <input type="hidden" name="currentManagerId" value={currentManagerId ?? ""} />

              <div>
                <label htmlFor="close-reason" className="text-[12px] font-semibold text-slate-200">
                  Причина
                </label>
                <input
                  id="close-reason"
                  name="closeReason"
                  required
                  maxLength={200}
                  placeholder="Например: вопрос решен"
                  className="mt-1.5 w-full rounded-[0.85rem] border border-slate-800 bg-slate-950/80 px-3 py-2 text-[13px] text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-sky-400/60"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={closeCloseModal} className={secondaryButtonClassName}>
                  Отмена
                </button>
                <button type="submit" disabled={isClosing} className={`${secondaryButtonClassName} min-w-[170px]`}>
                  {isClosing ? "Закрытие..." : "Подтвердить закрытие"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)]">
        <aside className="rounded-[1.1rem] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(2,6,23,0.9),rgba(15,23,42,0.8))] p-3.5 shadow-[0_16px_44px_rgba(2,6,23,0.34)] backdrop-blur sm:p-4 xl:sticky xl:top-4 xl:self-start">
          <div className="flex items-start justify-between gap-3 border-b border-slate-800/90 pb-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">Inbox</p>
              <h2 className="mt-1 text-[1.1rem] font-semibold tracking-[-0.03em] text-slate-50">Диалоги</h2>
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
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Поиск по имени, chat ID, причине или комментарию"
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
                      dialog.isClosed
                        ? `Закрыт${dialog.closedByManagerName ? `: ${dialog.closedByManagerName}` : ""}`
                        : !dialog.manager_auth_user_id
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
                    priority={dialog.aiInteractionPriority}
                    onSelect={() => {
                      setSelectedChatId(dialog.telegram_chat_id);
                      setCurrentPage(1);
                      closeActionsDropdown();
                    }}
                    preview={
                      dialog.isClosed
                        ? `${dialog.closeReason || "Без причины"}`
                        : formatMessagePreview(dialog.lastMessageText)
                    }
                    statusTone={
                      dialog.isClosed
                        ? "closed"
                        : !dialog.manager_auth_user_id
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
              {!selectedDialog?.manager_auth_user_id && !selectedDialog?.isClosed ? (
                <form action={assignAction} className="contents">
                  <input type="hidden" name="clientId" value={selectedDialog?.client_id ?? ""} />
                  <input type="hidden" name="currentManagerId" value={currentManagerId ?? ""} />
                  <input type="hidden" name="newManagerId" value={currentManagerId ?? ""} />
                  <button
                    type="submit"
                    disabled={!assignmentAvailability.canTake || isAssigning}
                    className={`${secondaryButtonClassName} min-w-[128px]`}
                  >
                    {isAssigning ? "Назначение..." : "Взять в работу"}
                  </button>
                </form>
              ) : null}

              {selectedDialog?.isClosed ? (
                <form action={reopenAction} className="contents">
                  <input type="hidden" name="clientId" value={selectedDialog.client_id} />
                  <input type="hidden" name="currentManagerId" value={currentManagerId ?? ""} />
                  <button
                    type="submit"
                    disabled={!reopenAvailability.canReopen || isReopening}
                    className={`${secondaryButtonClassName} min-w-[152px]`}
                  >
                    {isReopening ? "Переоткрытие..." : "Переоткрыть"}
                  </button>
                </form>
              ) : null}

              <span
                className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold ${clientStatus.toneClassName}`}
              >
                {clientStatus.label}
              </span>

              {selectedDialog?.aiInteractionPriority ? (
                <PriorityBadge priority={selectedDialog.aiInteractionPriority} />
              ) : null}

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
                    {!selectedDialog?.isClosed ? (
                      <form action={assignAction}>
                        <input type="hidden" name="clientId" value={selectedDialog?.client_id ?? ""} />
                        <input type="hidden" name="currentManagerId" value={currentManagerId ?? ""} />
                        <input type="hidden" name="newManagerId" value={currentManagerId ?? ""} />
                        <button
                          type="submit"
                          disabled={!assignmentAvailability.canTake || isAssigning}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] font-medium text-slate-200 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:text-slate-600"
                        >
                          Взять в работу
                        </button>
                      </form>
                    ) : null}

                    {!selectedDialog?.isClosed ? (
                      <form action={releaseAction}>
                        <input type="hidden" name="clientId" value={selectedDialog?.client_id ?? ""} />
                        <input type="hidden" name="currentManagerId" value={currentManagerId ?? ""} />
                        <button
                          type="submit"
                          disabled={!releaseAvailability.canRelease || isReleasing}
                          title={releaseAvailability.hint}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] font-medium text-slate-200 transition hover:bg-slate-900 disabled:cursor-not-allowed disabled:text-slate-600"
                        >
                          {isReleasing ? "Снятие..." : "Снять с работы"}
                        </button>
                      </form>
                    ) : null}

                    {selectedDialog?.isClosed ? (
                      <form action={reopenAction}>
                        <input type="hidden" name="clientId" value={selectedDialog?.client_id ?? ""} />
                        <input type="hidden" name="currentManagerId" value={currentManagerId ?? ""} />
                        <button
                          type="submit"
                          disabled={!reopenAvailability.canReopen || isReopening}
                          title={reopenAvailability.hint}
                          className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] font-medium text-emerald-200 transition hover:bg-emerald-500/10 disabled:cursor-not-allowed disabled:text-slate-600"
                        >
                          {isReopening ? "Переоткрытие..." : "Переоткрыть"}
                        </button>
                      </form>
                    ) : null}

                    {!selectedDialog?.isClosed ? (
                      <button
                        type="button"
                        disabled={!closeAvailability.canClose}
                        title={closeAvailability.hint}
                        onClick={() => {
                          setIsCloseModalOpen(true);
                          closeActionsDropdown();
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] font-medium text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:text-slate-600"
                      >
                        Закрыть диалог
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </div>

          {selectedDialog?.isClosed ? (
            <section className="mt-3 rounded-[0.95rem] border border-violet-500/20 bg-violet-500/10 px-3 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="flex flex-wrap items-start gap-2.5 text-[12px] text-slate-200">
                <div className="min-w-0 flex-1 rounded-[0.8rem] border border-white/5 bg-slate-950/45 px-2.5 py-2">
                  <p className="text-[9px] uppercase tracking-[0.18em] text-slate-500">Причина</p>
                  <p className="mt-0.5 truncate">{selectedDialog.closeReason || "Не указана"}</p>
                </div>
                <div className="min-w-[160px] rounded-[0.8rem] border border-white/5 bg-slate-950/45 px-2.5 py-2">
                  <p className="text-[9px] uppercase tracking-[0.18em] text-slate-500">Закрыл</p>
                  <p className="mt-0.5 truncate">{selectedDialog.closedByManagerName || "Неизвестный менеджер"}</p>
                </div>
                <div className="min-w-[170px] rounded-[0.8rem] border border-white/5 bg-slate-950/45 px-2.5 py-2">
                  <p className="text-[9px] uppercase tracking-[0.18em] text-slate-500">Дата</p>
                  <p className="mt-0.5">
                    {selectedDialog.closedAt ? dateFormatter.format(new Date(selectedDialog.closedAt)) : "Не указана"}
                  </p>
                </div>
              </div>
            </section>
          ) : null}

          {!selectedDialog?.isClosed ? (
            <section className="mt-3 rounded-[0.95rem] border border-slate-800 bg-slate-950/55 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-[13px] font-semibold text-slate-100">Назначение диалога</p>
                  <p className="mt-0.5 text-[12px] text-slate-400">{assignmentHint}</p>
                </div>

                <form
                  key={selectedDialog?.client_id ?? "no-dialog"}
                  ref={assignmentFormRef}
                  action={assignAction}
                  className="flex w-full flex-col gap-2.5 lg:w-auto lg:min-w-[28rem] lg:flex-row lg:items-end"
                >
                  <input type="hidden" name="clientId" value={selectedDialog?.client_id ?? ""} />
                  <input type="hidden" name="currentManagerId" value={currentManagerId ?? ""} />

                  <div className="flex-1">
                    <label htmlFor="assign-manager" className="text-[12px] font-semibold text-slate-200">
                      Менеджер
                    </label>
                    <select
                      id="assign-manager"
                      name="newManagerId"
                      defaultValue=""
                      required
                      disabled={!canAssignDialog || isAssigning || assignableManagers.length === 0}
                      className="mt-1.5 w-full rounded-[0.85rem] border border-slate-800 bg-slate-950/80 px-3 py-2 text-[13px] text-slate-100 outline-none transition focus:border-sky-400/60 disabled:cursor-not-allowed disabled:text-slate-500"
                    >
                      <option value="">Выберите менеджера</option>
                      {assignableManagers.map((manager) => (
                        <option key={manager.id} value={manager.id}>
                          {manager.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={!canAssignDialog || isAssigning || assignableManagers.length === 0}
                    className={`${secondaryButtonClassName} min-w-[140px]`}
                  >
                    {isAssigning ? "Назначение..." : "Назначить"}
                  </button>
                </form>
              </div>
            </section>
          ) : null}

          <div className="mt-3 space-y-3">
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
                              ? getOutgoingMessageAuthorLabel(message, managersById)
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
                    <p className="text-[13px] font-semibold text-slate-100">
                      {getOutgoingMessageLabel(selectedDialog)}
                    </p>
                    <p className="mt-0.5 text-[12px] text-slate-400">{replyAvailability.hint}</p>
                  </div>
                </div>

                <input type="hidden" name="clientId" value={selectedDialog?.client_id ?? ""} />
                <input type="hidden" name="currentManagerId" value={currentManagerId ?? ""} />
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
