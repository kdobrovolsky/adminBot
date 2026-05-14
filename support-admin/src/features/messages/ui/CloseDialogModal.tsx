import type { RefObject } from "react";
import type { DialogViewModel } from "@/types/message";
import { secondaryButtonClassName } from "@/features/messages/model/messagesDashboardConstants";

type CloseDialogModalProps = {
  closeFormRef: RefObject<HTMLFormElement | null>;
  currentManagerId: number | null;
  dialog: DialogViewModel;
  isClosing: boolean;
  onClose: () => void;
  action: (formData: FormData) => void;
};

export function CloseDialogModal({
  closeFormRef,
  currentManagerId,
  dialog,
  isClosing,
  onClose,
  action,
}: CloseDialogModalProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/80 px-3 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[1.2rem] border border-slate-800 bg-[linear-gradient(180deg,rgba(2,6,23,0.98),rgba(15,23,42,0.96))] p-4 shadow-[0_24px_70px_rgba(2,6,23,0.48)] sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">Close Dialog</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-50">Закрыть диалог</h3>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              После подтверждения диалог будет снят с менеджера и перенесен в архив.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-800 bg-slate-950/80 px-2.5 py-1 text-sm text-slate-300 transition hover:border-slate-700 hover:text-white"
          >
            Закрыть
          </button>
        </div>

        <form ref={closeFormRef} action={action} className="mt-4 space-y-3">
          <input type="hidden" name="clientId" value={dialog.client_id} />
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
            <button type="button" onClick={onClose} className={secondaryButtonClassName}>
              Отмена
            </button>
            <button type="submit" disabled={isClosing} className={`${secondaryButtonClassName} min-w-[170px]`}>
              {isClosing ? "Закрытие..." : "Подтвердить закрытие"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
