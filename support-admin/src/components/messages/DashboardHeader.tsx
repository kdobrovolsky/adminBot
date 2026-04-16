import { logoutAction } from "@/app/login/actions";

type DashboardHeaderProps = {
  dialogsCount: number;
  latestMessageLabel: string;
  messagesCount: number;
};

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1rem] border border-slate-800/80 bg-slate-950/55 px-4 py-3">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-slate-100 sm:text-[15px]">{value}</p>
    </div>
  );
}

export function DashboardHeader({
  dialogsCount,
  latestMessageLabel,
  messagesCount,
}: DashboardHeaderProps) {
  return (
    <section className="rounded-[1.5rem] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(2,6,23,0.9),rgba(15,23,42,0.78))] px-4 py-4 shadow-[0_18px_48px_rgba(2,6,23,0.28)] sm:rounded-[1.75rem] sm:px-5 sm:py-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            SupportBot Admin
          </p>
          <h1 className="mt-2 text-[1.35rem] font-semibold tracking-[-0.04em] text-slate-50 sm:text-[1.55rem]">
            Сообщения
          </h1>
          <p className="mt-1 text-sm text-slate-400">Диалоги, ответы менеджеров и текущая нагрузка.</p>
        </div>

        <form action={logoutAction} className="w-full sm:w-auto sm:shrink-0">
          <button
            type="submit"
            aria-label="Выйти из аккаунта"
            className="inline-flex min-h-10 w-full items-center justify-center rounded-full border border-slate-700 bg-slate-950/70 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-900 hover:text-white sm:w-auto"
          >
            Выйти
          </button>
        </form>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Metric label="Сообщения" value={messagesCount.toString()} />
        <Metric label="Диалоги" value={dialogsCount.toString()} />
        <Metric label="Последнее сообщение" value={latestMessageLabel} />
      </div>
    </section>
  );
}
