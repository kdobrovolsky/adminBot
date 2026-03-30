type StatCardProps = {
  description: string;
  label: string;
  value: string;
};

export function StatCard({ description, label, value }: StatCardProps) {
  return (
    <article className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <p className="text-sm font-medium uppercase tracking-[0.18em] text-slate-400">
        {label}
      </p>
      <p className="mt-4 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
        {value}
      </p>
      <p className="mt-3 text-sm leading-6 text-slate-500">{description}</p>
    </article>
  );
}
