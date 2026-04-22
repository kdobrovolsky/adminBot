type DialogListItemProps = {
  assignedLabel: string;
  chatId: number | string;
  incomingCount: number;
  isActive?: boolean;
  lastMessageAt: string;
  messageCount: number;
  onSelect?: () => void;
  preview: string;
  statusTone: "mine" | "unassigned" | "assigned";
  username: string | null;
};

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function DialogListItem({
  assignedLabel,
  chatId,
  incomingCount,
  isActive = false,
  lastMessageAt,
  messageCount,
  onSelect,
  preview,
  statusTone,
  username,
}: DialogListItemProps) {
  const hasIncomingMessages = incomingCount > 0;
  const statusClassName =
    statusTone === "mine"
      ? "bg-emerald-400"
      : statusTone === "unassigned"
        ? "bg-amber-400"
        : "bg-sky-400";

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      className={[
        "group relative block w-full overflow-hidden rounded-[0.95rem] border px-3 py-2.5 text-left transition-all duration-200 active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 sm:px-3.5",
        isActive
          ? "border-sky-400/50 bg-[linear-gradient(160deg,rgba(8,47,73,0.96),rgba(15,23,42,0.98))] text-white shadow-[0_14px_34px_rgba(2,132,199,0.18)]"
          : "border-slate-800/80 bg-[linear-gradient(180deg,rgba(2,6,23,0.74),rgba(15,23,42,0.64))] text-slate-100 shadow-[0_8px_24px_rgba(2,6,23,0.2)] hover:-translate-y-0.5 hover:border-slate-700 hover:bg-[linear-gradient(180deg,rgba(15,23,42,0.88),rgba(15,23,42,0.74))] hover:shadow-[0_12px_28px_rgba(2,6,23,0.28)]",
      ].join(" ")}
    >
      <div
        className={[
          "absolute inset-y-4 left-0 w-1 rounded-full transition-colors",
          isActive ? "bg-sky-400" : "bg-transparent group-hover:bg-slate-700",
        ].join(" ")}
      />

      <div className="flex items-start justify-between gap-2.5 sm:gap-3">
        <div className="min-w-0">
          <div className="flex min-w-0 items-center gap-2">
            <span className={`h-2 w-2 shrink-0 rounded-full ${statusClassName}`} />
            <p className="truncate text-[13px] font-semibold tracking-[-0.02em] text-inherit">
              {username || "Без username"}
            </p>
          </div>
          <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Chat ID
          </p>
          <p
            className={[
              "mt-0.5 break-all font-mono text-[11px]",
              isActive ? "text-sky-100/90" : "text-slate-400",
            ].join(" ")}
          >
            {chatId}
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5">
            {hasIncomingMessages ? (
              <span className="rounded-full bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200">
                {incomingCount}
              </span>
            ) : null}
            <span
              className={[
                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                isActive
                  ? "bg-sky-400/15 text-sky-100"
                  : "bg-slate-900 text-slate-400 group-hover:bg-slate-800 group-hover:text-slate-300",
              ].join(" ")}
            >
              {messageCount} msg
            </span>
          </div>
          <p className={["text-[10px]", isActive ? "text-slate-300" : "text-slate-500"].join(" ")}>
            {dateFormatter.format(new Date(lastMessageAt))}
          </p>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2 text-[10px] text-slate-500">
        <span className="truncate">{assignedLabel}</span>
        {hasIncomingMessages ? <span className="shrink-0 text-amber-200/80">new</span> : null}
      </div>

      <div className="mt-1.5 rounded-[0.75rem] border border-white/5 bg-black/10 px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <p
          className={[
            "line-clamp-2 text-[12px] leading-5 transition-colors",
            isActive ? "text-slate-100" : "text-slate-400",
          ].join(" ")}
        >
          {preview}
        </p>
      </div>
    </button>
  );
}
