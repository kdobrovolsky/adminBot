"use client";

type AuthSubmitButtonProps = {
  idleLabel: string;
  pendingLabel: string;
  pending: boolean;
};

export function AuthSubmitButton({
  idleLabel,
  pending,
  pendingLabel,
}: AuthSubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-70"
    >
      {pending ? pendingLabel : idleLabel}
    </button>
  );
}
