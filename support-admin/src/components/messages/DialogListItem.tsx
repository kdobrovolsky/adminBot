type DialogListItemProps = {
  chatId: number | string;
  isActive?: boolean;
  lastMessageAt: string;
  messageCount: number;
  onSelect?: () => void;
  preview: string;
  username: string | null;
};

const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function DialogListItem({
  chatId,
  isActive = false,
  lastMessageAt,
  messageCount,
  onSelect,
  preview,
  username,
}: DialogListItemProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={isActive}
      className={[
        "group relative block w-full overflow-hidden rounded-[1.55rem] border px-4 py-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950",
        isActive
          ? "border-sky-400/50 bg-[linear-gradient(160deg,rgba(8,47,73,0.96),rgba(15,23,42,0.98))] text-white shadow-[0_24px_60px_rgba(2,132,199,0.22)]"
          : "border-slate-800/80 bg-slate-950/60 text-slate-100 shadow-[0_14px_36px_rgba(2,6,23,0.24)] hover:-translate-y-0.5 hover:border-slate-700 hover:bg-slate-900/85 hover:shadow-[0_18px_40px_rgba(2,6,23,0.34)]",
      ].join(" ")}
    >
      <div
        className={[
          "absolute inset-y-4 left-0 w-1 rounded-full transition-colors",
          isActive ? "bg-sky-400" : "bg-transparent group-hover:bg-slate-700",
        ].join(" ")}
      />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold tracking-[-0.02em] text-inherit">
            {username || "Без username"}
          </p>
          <p className="mt-1.5 text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">
            Chat ID
          </p>
          <p
            className={[
              "mt-1 break-all font-mono text-[12px]",
              isActive ? "text-sky-100/90" : "text-slate-400",
            ].join(" ")}
          >
            {chatId}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span
            className={[
              "rounded-full px-2.5 py-1 text-[11px] font-semibold",
              isActive
                ? "bg-sky-400/15 text-sky-100"
                : "bg-slate-900 text-slate-400 group-hover:bg-slate-800 group-hover:text-slate-300",
            ].join(" ")}
          >
            {messageCount} msg
          </span>
          <p className={["text-[11px]", isActive ? "text-slate-300" : "text-slate-500"].join(" ")}>
            {dateFormatter.format(new Date(lastMessageAt))}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-[1.1rem] border border-white/5 bg-black/10 px-3 py-3">
        <p
          className={[
            "line-clamp-2 text-sm leading-6",
            isActive ? "text-slate-100" : "text-slate-400",
          ].join(" ")}
        >
          {preview}
        </p>
      </div>
    </button>
  );
}
