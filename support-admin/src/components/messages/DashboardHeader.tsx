import { logoutAction } from "@/app/login/actions";

export function DashboardHeader() {
  return (
    <section className="rounded-[1.1rem] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(2,6,23,0.9),rgba(15,23,42,0.78))] px-4 py-3.5 shadow-[0_14px_36px_rgba(2,6,23,0.24)] sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            SupportBot Admin
          </p>
          <h1 className="mt-1 text-[1.2rem] font-semibold tracking-[-0.04em] text-slate-50 sm:text-[1.35rem]">
            Сообщения
          </h1>
          <p className="mt-0.5 text-[13px] text-slate-400">
            Диалоги, ответы менеджеров и текущая нагрузка.
          </p>
        </div>

        <form action={logoutAction} className="w-full sm:w-auto sm:shrink-0">
          <button
            type="submit"
            aria-label="Выйти из аккаунта"
            className="inline-flex min-h-9 w-full items-center justify-center rounded-full border border-slate-700 bg-slate-950/70 px-3.5 py-1.5 text-[13px] font-semibold text-slate-200 transition hover:border-slate-600 hover:bg-slate-900 hover:text-white sm:w-auto"
          >
            Выйти
          </button>
        </form>
      </div>
    </section>
  );
}
