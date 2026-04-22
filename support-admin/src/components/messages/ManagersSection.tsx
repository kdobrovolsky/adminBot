import type { DialogViewModel, ManagerSummary } from "@/types/message";

type ManagersSectionProps = {
  currentUserId: string | null;
  dialogs: DialogViewModel[];
  managers: ManagerSummary[];
};

type ManagerMetrics = {
  assignedClients: number;
  totalMessages: number;
  latestActivityAt: string | null;
};

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

function getManagerDisplayName(manager: ManagerSummary): string {
  const fullName = [manager.first_name?.trim(), manager.last_name?.trim()].filter(Boolean).join(" ");

  if (fullName) {
    return fullName;
  }

  return manager.email ?? `Менеджер #${manager.id}`;
}

function buildMetrics(dialogs: DialogViewModel[]) {
  const metrics = new Map<number, ManagerMetrics>();

  for (const dialog of dialogs) {
    if (!dialog.current_manager_id) {
      continue;
    }

    const current = metrics.get(dialog.current_manager_id) ?? {
      assignedClients: 0,
      totalMessages: 0,
      latestActivityAt: null,
    };

    current.assignedClients += 1;
    current.totalMessages += dialog.messageCount;

    if (
      !current.latestActivityAt ||
      new Date(dialog.lastMessageAt).getTime() > new Date(current.latestActivityAt).getTime()
    ) {
      current.latestActivityAt = dialog.lastMessageAt;
    }

    metrics.set(dialog.current_manager_id, current);
  }

  return metrics;
}

export function ManagersSection({ currentUserId, dialogs, managers }: ManagersSectionProps) {
  const metricsByManagerId = buildMetrics(dialogs);

  const managersWithMetrics = [...managers]
    .map((manager) => ({
      manager,
      metrics: metricsByManagerId.get(manager.id) ?? {
        assignedClients: 0,
        totalMessages: 0,
        latestActivityAt: null,
      },
    }))
    .sort((left, right) => {
      if (right.metrics.assignedClients !== left.metrics.assignedClients) {
        return right.metrics.assignedClients - left.metrics.assignedClients;
      }

      return getManagerDisplayName(left.manager).localeCompare(getManagerDisplayName(right.manager), "ru");
    });

  return (
    <section className="rounded-[1.1rem] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(2,6,23,0.88),rgba(15,23,42,0.74))] p-3.5 shadow-[0_14px_36px_rgba(2,6,23,0.24)] backdrop-blur sm:p-4">
      <div className="flex flex-col gap-1.5 border-b border-slate-800/90 pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Team
          </p>
          <h2 className="mt-0.5 text-base font-semibold tracking-[-0.03em] text-slate-50">
            Менеджеры
          </h2>
        </div>

        <p className="text-[13px] text-slate-400">Всего: {managers.length}</p>
      </div>

      {managersWithMetrics.length > 0 ? (
        <div className="mt-3 overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)_76px_88px_150px] gap-2.5 px-2.5 py-1.5 text-[9px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              <span>Менеджер</span>
              <span>Роль</span>
              <span>Клиенты</span>
              <span>Сообщения</span>
              <span>Активность</span>
            </div>

            <div className="space-y-1.5">
              {managersWithMetrics.map(({ manager, metrics }) => {
                const isCurrentUser = currentUserId && manager.auth_user_id === currentUserId;

                return (
                  <article
                    key={manager.id}
                    className="grid grid-cols-[minmax(0,2fr)_minmax(0,1.1fr)_76px_88px_150px] items-center gap-2.5 rounded-[0.75rem] border border-slate-800/90 bg-slate-950/55 px-2.5 py-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-[13px] font-semibold text-slate-100">
                          {getManagerDisplayName(manager)}
                        </p>
                        {isCurrentUser ? (
                          <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-2 py-0.5 text-[10px] font-semibold text-sky-100">
                            Вы
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-0.5 truncate text-[11px] text-slate-500">{manager.email || "Email не указан"}</p>
                    </div>

                    <p className="truncate text-[13px] text-slate-300">{manager.company_role || "Не указана"}</p>
                    <p className="text-[13px] font-semibold text-slate-100">{metrics.assignedClients}</p>
                    <p className="text-[13px] font-semibold text-slate-100">{metrics.totalMessages}</p>
                    <p className="text-[11px] text-slate-400">
                      {metrics.latestActivityAt
                        ? dateFormatter.format(new Date(metrics.latestActivityAt))
                        : "Нет активности"}
                    </p>
                  </article>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-3 rounded-[0.9rem] border border-dashed border-slate-700 bg-slate-950/55 px-4 py-6 text-center">
          <p className="text-sm font-medium text-slate-300">Менеджеры не найдены</p>
          <p className="mt-2 text-sm text-slate-400">
            Раздел заполнится после появления записей в `manager_details`.
          </p>
        </div>
      )}
    </section>
  );
}
