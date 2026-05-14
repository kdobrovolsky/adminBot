"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useActionState, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  assignClientToManagerFormAction,
  closeDialogFormAction,
  releaseClientFromWorkFormAction,
  reopenDialogFormAction,
  sendManagerMessageFormAction,
} from "@/app/actions";
import { useToast } from "@/components/ui/ToastProvider";
import { dashboardQueryKey } from "@/features/dashbord/queryKeys";
import {
  buildAssignableManagers,
  buildDialogListItemViewModel,
  getAssignmentAvailability,
  getClientStatus,
  getCloseAvailability,
  getManagerNameParts,
  getReleaseAvailability,
  getReopenAvailability,
  getReplyAvailability,
  matchesDialogFilter,
} from "@/features/messages/lib/messagesDashboard";
import {
  initialActionState,
  MESSAGES_PER_PAGE,
} from "@/features/messages/model/messagesDashboardConstants";
import type { DialogFilterId } from "@/features/messages/model/messagesDashboard";
import { MessagesListener } from "@/features/messages/realtime/MessagesListener";
import { CloseDialogModal } from "@/features/messages/ui/CloseDialogModal";
import { DialogDetailsPanel } from "@/features/messages/ui/DialogDetailsPanel";
import { DialogsSidebar } from "@/features/messages/ui/DialogsSidebar";
import type { DialogViewModel, ManagerSummary } from "@/types/message";

type MessagesDashboardProps = {
  currentManagerId: number | null;
  currentUserId: string | null;
  dialogs: DialogViewModel[];
  managers?: ManagerSummary[];
};

export function MessagesDashboard({
  currentManagerId,
  currentUserId,
  dialogs,
  managers = [],
}: MessagesDashboardProps) {
  const assignmentFormRef = useRef<HTMLFormElement>(null);
  const replyFormRef = useRef<HTMLFormElement>(null);
  const closeFormRef = useRef<HTMLFormElement>(null);
  const queryClient = useQueryClient();
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
  const assignableManagers = buildAssignableManagers(
    managers,
    currentAssignedManagerId,
    managerFullNameCounts,
  );
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
  const sidebarDialogs = filteredDialogs.map((dialog) => buildDialogListItemViewModel(dialog, currentUserId));

  useEffect(() => {
    if (assignState.success) {
      showToast(assignState.success);
      assignmentFormRef.current?.reset();
      startTransition(() => {
        void queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
      });
    }
  }, [assignState, queryClient, showToast, startTransition]);

  useEffect(() => {
    if (assignState.error) {
      showToast(assignState.error, "error");
    }
  }, [assignState, showToast]);

  useEffect(() => {
    if (releaseState.success) {
      showToast(releaseState.success);
      startTransition(() => {
        void queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
      });
    }
  }, [releaseState, queryClient, showToast, startTransition]);

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
        void queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
      });
    }
  }, [closeState, queryClient, showToast, startTransition]);

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
        void queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
      });
    }
  }, [reopenState, queryClient, showToast, startTransition]);

  useEffect(() => {
    if (reopenState.error) {
      showToast(reopenState.error, "error");
    }
  }, [reopenState, showToast]);

  useEffect(() => {
    if (replyState.success) {
      showToast(replyState.success);
      replyFormRef.current?.reset();
      startTransition(() => {
        void queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
      });
    }
  }, [replyState, queryClient, showToast, startTransition]);

  useEffect(() => {
    if (replyState.error) {
      showToast(replyState.error, "error");
    }
  }, [replyState, showToast]);

  return (
    <>
      <MessagesListener />

      {isCloseModalOpen && selectedDialog ? (
        <CloseDialogModal
          action={closeAction}
          closeFormRef={closeFormRef}
          currentManagerId={currentManagerId}
          dialog={selectedDialog}
          isClosing={isClosing}
          onClose={closeCloseModal}
        />
      ) : null}

      <section className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)]">
        <DialogsSidebar
          activeFilter={activeFilter}
          dialogs={dialogs}
          displayedDialogs={sidebarDialogs}
          filterCounts={filterCounts}
          incomingTotal={incomingTotal}
          isRefreshing={isRefreshing}
          onFilterChange={(filterId) => {
            setActiveFilter(filterId);
            setCurrentPage(1);
          }}
          onRefresh={() =>
            startTransition(() => {
              void queryClient.invalidateQueries({ queryKey: dashboardQueryKey });
            })
          }
          onSearchChange={(query) => {
            setSearchQuery(query);
            setCurrentPage(1);
          }}
          onSelectDialog={(telegramChatId) => {
            setSelectedChatId(telegramChatId);
            setCurrentPage(1);
            closeActionsDropdown();
          }}
          searchQuery={searchQuery}
          selectedChatId={selectedDialog?.telegram_chat_id ?? null}
        />

        <DialogDetailsPanel
          assignAction={assignAction}
          assignableManagers={assignableManagers}
          assignmentAvailability={assignmentAvailability}
          assignmentFormRef={assignmentFormRef}
          assignmentHint={assignmentHint}
          canAssignDialog={canAssignDialog}
          clientStatus={clientStatus}
          closeAvailability={closeAvailability}
          currentManagerId={currentManagerId}
          displayedMessages={displayedMessages}
          isActionsDropdownOpen={isActionsDropdownOpen}
          isAssigning={isAssigning}
          isReleasing={isReleasing}
          isReopening={isReopening}
          isSending={isSending}
          managersById={managersById}
          onCloseDialog={() => {
            setIsCloseModalOpen(true);
            closeActionsDropdown();
          }}
          onNextPage={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          onOpenActionsChange={() => setIsActionsDropdownOpen((open) => !open)}
          onPreviousPage={() => setCurrentPage((page) => Math.max(1, page - 1))}
          releaseAction={releaseAction}
          releaseAvailability={releaseAvailability}
          reopenAction={reopenAction}
          reopenAvailability={reopenAvailability}
          replyAction={replyAction}
          replyAvailability={replyAvailability}
          replyFormRef={replyFormRef}
          safeCurrentPage={safeCurrentPage}
          selectedDialog={selectedDialog}
          totalPages={totalPages}
        />
      </section>
    </>
  );
}
