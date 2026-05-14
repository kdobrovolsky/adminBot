import type { RefObject } from "react";
import { PriorityBadge } from "@/components/messages/PriorityBadge";
import type { DialogViewModel, ManagerSummary, Message } from "@/types/message";
import type {
  AssignmentAvailability,
  ClientStatus,
  CloseAvailability,
  ManagerOption,
  ReleaseAvailability,
  ReplyAvailability,
  ReopenAvailability,
} from "@/features/messages/model/messagesDashboard";
import {
  dateFormatter,
  secondaryButtonClassName,
} from "@/features/messages/model/messagesDashboardConstants";
import { getOutgoingMessageAuthorLabel, getOutgoingMessageLabel } from "@/features/messages/lib/messagesDashboard";

type DialogDetailsPanelProps = {
  assignAction: (formData: FormData) => void;
  assignableManagers: ManagerOption[];
  assignmentAvailability: AssignmentAvailability;
  assignmentFormRef: RefObject<HTMLFormElement | null>;
  assignmentHint: string;
  canAssignDialog: boolean;
  clientStatus: ClientStatus;
  closeAvailability: CloseAvailability;
  currentManagerId: number | null;
  displayedMessages: Message[];
  isActionsDropdownOpen: boolean;
  isAssigning: boolean;
  isReleasing: boolean;
  isReopening: boolean;
  isSending: boolean;
  managersById: Map<number, ManagerSummary>;
  onCloseDialog: () => void;
  onNextPage: () => void;
  onOpenActionsChange: () => void;
  onPreviousPage: () => void;
  releaseAction: (formData: FormData) => void;
  releaseAvailability: ReleaseAvailability;
  reopenAction: (formData: FormData) => void;
  reopenAvailability: ReopenAvailability;
  replyAction: (formData: FormData) => void;
  replyAvailability: ReplyAvailability;
  replyFormRef: RefObject<HTMLFormElement | null>;
  safeCurrentPage: number;
  selectedDialog: DialogViewModel | null;
  totalPages: number;
};

export function DialogDetailsPanel({
  assignAction,
  assignableManagers,
  assignmentAvailability,
  assignmentFormRef,
  assignmentHint,
  canAssignDialog,
  clientStatus,
  closeAvailability,
  currentManagerId,
  displayedMessages,
  isActionsDropdownOpen,
  isAssigning,
  isReleasing,
  isReopening,
  isSending,
  managersById,
  onCloseDialog,
  onNextPage,
  onOpenActionsChange,
  onPreviousPage,
  releaseAction,
  releaseAvailability,
  reopenAction,
  reopenAvailability,
  replyAction,
  replyAvailability,
  replyFormRef,
  safeCurrentPage,
  selectedDialog,
  totalPages,
}: DialogDetailsPanelProps) {
  return (
    <section className="rounded-[1.1rem] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(15,23,42,0.78))] p-3.5 shadow-[0_16px_44px_rgba(2,6,23,0.34)] backdrop-blur sm:p-4 xl:p-5">
      <div className="flex flex-col gap-3 border-b border-slate-900/70 pb-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="truncate text-[1.05rem] font-semibold tracking-[-0.03em] text-slate-100 sm:text-[1.15rem]">
            {selectedDialog?.displayName || "Выберите диалог"}
          </h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
            <span className="break-all font-mono">Chat ID: {selectedDialog ? selectedDialog.telegram_chat_id : "—"}</span>
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
            title={clientStatus.hint}
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
              onClick={onOpenActionsChange}
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
                    onClick={onCloseDialog}
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
        {displayedMessages.length > 0 ? (
          <div className="space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-[0.85rem] border border-slate-800 bg-slate-950/65 px-2.5 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:gap-2.5">
              <button
                type="button"
                onClick={onPreviousPage}
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
                onClick={onNextPage}
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
                  key={message.render_key}
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
            <p className="mt-2 text-sm leading-6 text-slate-400">Здесь появится история выбранного диалога.</p>
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
                <p className="text-[13px] font-semibold text-slate-100">{getOutgoingMessageLabel(selectedDialog)}</p>
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
  );
}
