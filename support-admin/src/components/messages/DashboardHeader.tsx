"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

type DashboardHeaderProps = {
  dialogsCount: number;
  latestMessageLabel: string;
  messagesCount: number;
};

const compactButtonClassName =
  "rounded-full border border-slate-700/90 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.76))] px-3.5 py-1.5 text-[11px] font-semibold text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-500/40 hover:bg-[linear-gradient(180deg,rgba(30,41,59,0.96),rgba(15,23,42,0.88))] hover:text-white hover:shadow-[0_12px_24px_rgba(2,132,199,0.12)] active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:translate-y-0 disabled:scale-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900/70 disabled:text-slate-500 disabled:shadow-none";

function Metric({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-[1.2rem] border border-slate-800/80 bg-slate-950/45 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold tracking-[-0.02em] text-slate-100 sm:text-[15px]">
        {value}
      </p>
    </div>
  );
}

export function DashboardHeader({
  dialogsCount,
  latestMessageLabel,
  messagesCount,
}: DashboardHeaderProps) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();

  return (
    <section className="relative overflow-hidden rounded-[2rem] border border-slate-800/80 bg-[linear-gradient(145deg,#020617_0%,#0f172a_60%,#111827_100%)] px-5 py-5 text-white shadow-[0_30px_100px_rgba(2,6,23,0.55)] sm:rounded-[2.25rem] sm:px-7 sm:py-6 lg:px-8">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.18),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(14,165,233,0.12),transparent_24%)]" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.32em] text-sky-100">
              SupportBot Admin
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-slate-400">
              Readonly dashboard
            </span>
          </div>

          <h1 className="mt-4 text-[1.9rem] font-semibold tracking-[-0.055em] text-white sm:text-[2.35rem]">
            SupportBot - Сообщения
          </h1>
          <p className="mt-2 text-sm leading-7 text-slate-400 sm:text-[15px]">
            Просмотр диалогов и переписок пользователей.
          </p>
        </div>

        <div className="flex shrink-0 items-start lg:justify-end">
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

      <div className="relative mt-5 grid gap-3 sm:grid-cols-3">
        <Metric label="Всего сообщений" value={messagesCount.toString()} />
        <Metric label="Активные диалоги" value={dialogsCount.toString()} />
        <Metric label="Последнее сообщение" value={latestMessageLabel} />
      </div>
    </section>
  );
}
