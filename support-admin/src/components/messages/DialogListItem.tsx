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
        "block w-full rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2",
        isActive
          ? "border-slate-900 bg-slate-900 text-white"
          : "border-slate-200 bg-slate-50 text-slate-900",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {username || "Без username"}
          </p>
          <p
            className={[
              "mt-1 text-xs",
              isActive ? "text-slate-300" : "text-slate-500",
            ].join(" ")}
          >
            Chat ID: {chatId}
          </p>
        </div>
        <span
          className={[
            "rounded-full px-2.5 py-1 text-xs font-medium",
            isActive ? "bg-white/10 text-white" : "bg-white text-slate-600",
          ].join(" ")}
        >
          {messageCount}
        </span>
      </div>

      <p
        className={[
          "mt-4 line-clamp-2 text-sm leading-6",
          isActive ? "text-slate-200" : "text-slate-600",
        ].join(" ")}
      >
        {preview}
      </p>

      <p
        className={[
          "mt-4 text-xs",
          isActive ? "text-slate-400" : "text-slate-500",
        ].join(" ")}
      >
        {dateFormatter.format(new Date(lastMessageAt))}
      </p>
    </button>
  );
}
