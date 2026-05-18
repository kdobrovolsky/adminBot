import type { AiInteractionPriority } from "@/types/message";

type PriorityBadgeProps = {
  priority: AiInteractionPriority;
};

const priorityStyles: Record<AiInteractionPriority, string> = {
  hard:
    "border-red-500/75 bg-[linear-gradient(180deg,rgba(239,68,68,0.34),rgba(127,29,29,0.3))] text-red-50 shadow-[0_0_0_1px_rgba(248,113,113,0.2),0_10px_24px_rgba(185,28,28,0.24)]",
  urgent:
    "border-red-400/70 bg-[linear-gradient(180deg,rgba(239,68,68,0.32),rgba(153,27,27,0.28))] text-red-50 shadow-[0_0_0_1px_rgba(248,113,113,0.18),0_10px_24px_rgba(220,38,38,0.22)]",
  normal: "border-sky-500/30 bg-sky-500/10 text-sky-100",
  low: "border-emerald-500/20 bg-emerald-500/10 text-emerald-100/90",
};

const priorityLabels: Record<AiInteractionPriority, string> = {
  hard: "Hard",
  urgent: "Urgent",
  normal: "Normal",
  low: "Low",
};

export function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.18em] ${priorityStyles[priority]}`}
    >
      {priorityLabels[priority]}
    </span>
  );
}
