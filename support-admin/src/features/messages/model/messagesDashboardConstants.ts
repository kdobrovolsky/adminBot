import type { ActionResult } from "@/types/message";
import type { DialogFilterOption } from "./messagesDashboard";

export const dateFormatter = new Intl.DateTimeFormat("ru-RU", {
  dateStyle: "medium",
  timeStyle: "short",
});

export const initialActionState: ActionResult = {
  error: null,
  success: null,
};

export const MESSAGES_PER_PAGE = 5;

export const secondaryButtonClassName =
  "rounded-lg border border-slate-700/90 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.76))] px-3 py-1.5 text-[12px] font-semibold text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-500/40 hover:bg-[linear-gradient(180deg,rgba(30,41,59,0.96),rgba(15,23,42,0.88))] hover:text-white hover:shadow-[0_8px_18px_rgba(2,132,199,0.1)] active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:translate-y-0 disabled:scale-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900/70 disabled:text-slate-500 disabled:shadow-none";

export const compactButtonClassName =
  "rounded-full border border-slate-700/90 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.76))] px-3 py-1 text-[10px] font-semibold text-slate-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-sky-500/40 hover:bg-[linear-gradient(180deg,rgba(30,41,59,0.96),rgba(15,23,42,0.88))] hover:text-white hover:shadow-[0_8px_18px_rgba(2,132,199,0.1)] active:translate-y-0 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:translate-y-0 disabled:scale-100 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-900/70 disabled:text-slate-500 disabled:shadow-none";

export const dialogFilters: DialogFilterOption[] = [
  { id: "all", label: "Все" },
  { id: "mine", label: "Мои" },
  { id: "unassigned", label: "Без менеджера" },
  { id: "assignedToOthers", label: "Назначены другим" },
  { id: "closed", label: "Закрытые" },
];
