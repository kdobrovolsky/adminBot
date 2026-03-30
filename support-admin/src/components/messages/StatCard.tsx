type StatCardProps = {
  description: string;
  label: string;
  value: string;
};

export function StatCard({ description, label, value }: StatCardProps) {
  return (
    <article className="relative overflow-hidden rounded-[1.45rem] border border-slate-800/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.8))] p-4 shadow-[0_18px_48px_rgba(2,6,23,0.38)] backdrop-blur sm:rounded-[1.6rem] sm:p-5">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/70 to-transparent" />
      <div className="absolute right-0 top-0 h-24 w-24 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-[1.85rem] font-semibold tracking-[-0.05em] text-slate-50 sm:mt-4 sm:text-[2.15rem]">
        {value}
      </p>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400 sm:mt-3">{description}</p>
    </article>
  );
}
