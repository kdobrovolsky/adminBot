import type { DialogViewModel, ManagerSummary, Message } from "@/types/message";
import type {
  AssignmentAvailability,
  ClientStatus,
  CloseAvailability,
  DialogFilterId,
  DialogListItemViewModel,
  ManagerOption,
  ReleaseAvailability,
  ReplyAvailability,
  ReopenAvailability,
} from "@/features/messages/model/messagesDashboard";

export function formatMessagePreview(text: string | null) {
  if (!text) {
    return "Пустое сообщение";
  }

  return text.length > 96 ? `${text.slice(0, 96)}...` : text;
}

export function matchesDialogFilter(
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

export function getManagerDisplayName(dialog: DialogViewModel | null): string {
  if (!dialog?.manager_auth_user_id) {
    return "Не назначен";
  }

  const fullName = [dialog.manager_first_name?.trim(), dialog.manager_last_name?.trim()].filter(Boolean).join(" ");

  return fullName || "Менеджер без имени";
}

export function getOutgoingMessageLabel(dialog: DialogViewModel | null): string {
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

export function getManagerNameBySummary(manager: ManagerSummary | undefined): string | null {
  if (!manager) {
    return null;
  }

  const fullName = [manager.first_name?.trim(), manager.last_name?.trim()].filter(Boolean).join(" ");

  return fullName || manager.email?.trim() || `Manager #${manager.id}`;
}

export function getManagerNameParts(manager: ManagerSummary): {
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

export function getManagerOptionLabel(
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

export function getOutgoingMessageAuthorLabel(
  message: Message,
  managersById: Map<number, ManagerSummary>,
): string {
  if (message.manager_id) {
    const managerName = getManagerNameBySummary(managersById.get(message.manager_id));

    if (managerName) {
      return `Ответ менеджера ${managerName}`;
    }
  }

  return "Ответ менеджера";
}

export function getClientStatus(
  dialog: DialogViewModel | null,
  currentUserId: string | null,
): ClientStatus {
  if (!dialog) {
    return {
      hint: "Выберите диалог, чтобы посмотреть текущего ответственного.",
      label: "Нет выбранного клиента",
      toneClassName: "border-slate-800 bg-slate-900/80 text-slate-300",
    };
  }

  if (dialog.isClosed) {
    return {
      hint: "Диалог закрыт и находится в архиве.",
      label: "Закрыт",
      toneClassName: "border-violet-500/30 bg-violet-500/10 text-violet-200",
    };
  }

  if (!dialog.manager_auth_user_id) {
    return {
      hint: "Клиент ожидает назначения в работу.",
      label: "Без менеджера",
      toneClassName: "border-amber-500/30 bg-amber-500/10 text-amber-200",
    };
  }

  if (currentUserId && dialog.manager_auth_user_id === currentUserId) {
    return {
      hint: "Вы можете отвечать клиенту и управлять диалогом.",
      label: "У вас в работе",
      toneClassName: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    };
  }

  return {
    hint: "Ответ и назначение ограничены текущим ответственным.",
    label: "Назначен другому менеджеру",
    toneClassName: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  };
}

export function getReplyAvailability(
  dialog: DialogViewModel | null,
  currentUserId: string | null,
): ReplyAvailability {
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

export function getAssignmentAvailability(
  dialog: DialogViewModel | null,
  currentUserId: string | null,
): AssignmentAvailability {
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

export function getReleaseAvailability(
  dialog: DialogViewModel | null,
  currentUserId: string | null,
): ReleaseAvailability {
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

export function getCloseAvailability(
  dialog: DialogViewModel | null,
  currentUserId: string | null,
): CloseAvailability {
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

export function getReopenAvailability(dialog: DialogViewModel | null): ReopenAvailability {
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

export function buildAssignableManagers(
  managers: ManagerSummary[],
  currentAssignedManagerId: number | null,
  managerFullNameCounts: Map<string, number>,
): ManagerOption[] {
  return managers
    .filter((manager) => manager.id !== currentAssignedManagerId)
    .map((manager) => ({
      id: manager.id,
      label: getManagerOptionLabel(manager, managerFullNameCounts),
    }));
}

export function buildDialogListItemViewModel(
  dialog: DialogViewModel,
  currentUserId: string | null,
): DialogListItemViewModel {
  return {
    assignedLabel: dialog.isClosed
      ? `Закрыт${dialog.closedByManagerName ? `: ${dialog.closedByManagerName}` : ""}`
      : !dialog.manager_auth_user_id
        ? "Без менеджера"
        : dialog.manager_auth_user_id === currentUserId
          ? "У вас в работе"
          : getManagerDisplayName(dialog),
    dialog,
    preview: dialog.isClosed
      ? `${dialog.closeReason || "Без причины"}`
      : formatMessagePreview(dialog.lastMessageText),
    statusTone: dialog.isClosed
      ? "closed"
      : !dialog.manager_auth_user_id
        ? "unassigned"
        : dialog.manager_auth_user_id === currentUserId
          ? "mine"
          : "assigned",
  };
}
