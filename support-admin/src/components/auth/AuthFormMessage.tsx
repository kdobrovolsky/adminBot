import type { AuthFormState } from "@/app/login/actions";

type AuthFormMessageProps = {
  state: Pick<AuthFormState, "error" | "success">;
};

export function AuthFormMessage({ state }: AuthFormMessageProps) {
  if (!state.error && !state.success) {
    return null;
  }

  const isSuccess = Boolean(state.success);

  return (
    <div
      className={`rounded-2xl px-4 py-3 text-sm ${
        isSuccess
          ? "border border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
          : "border border-red-500/25 bg-red-500/10 text-red-200"
      }`}
    >
      {state.success ?? state.error}
    </div>
  );
}
