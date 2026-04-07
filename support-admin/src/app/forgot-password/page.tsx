import Link from "next/link";
import { forgotPasswordAction } from "@/app/login/actions";

export const metadata = {
  title: "Recovery | SupportBot Admin",
  description: "Password recovery page for SupportBot Admin",
};

type ForgotPasswordPageProps = {
  searchParams?: Promise<{
    error?: string;
    success?: string;
  }>;
};

function getStateMessage(error?: string, success?: string) {
  if (success === "sent") {
    return {
      tone: "success" as const,
      text: "Если пользователь существует, письмо со ссылкой на сброс уже отправлено.",
    };
  }

  if (error === "invalid-form") {
    return {
      tone: "error" as const,
      text: "Проверьте email и попробуйте снова.",
    };
  }

  if (error === "request-failed") {
    return {
      tone: "error" as const,
      text: "Не удалось отправить письмо для восстановления пароля.",
    };
  }

  return null;
}

export default async function ForgotPasswordPage({
  searchParams,
}: ForgotPasswordPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const stateMessage = getStateMessage(
    resolvedSearchParams?.error,
    resolvedSearchParams?.success,
  );

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8 text-slate-100 sm:px-6">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur">
        <div className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(14,116,144,0.28),rgba(15,23,42,0.16))] px-6 py-6 sm:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
            SupportBot Admin
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            Recovery
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Введите email. Supabase отправит письмо со ссылкой на сброс пароля.
          </p>
        </div>

        <form
          action={forgotPasswordAction}
          className="space-y-5 px-6 py-6 sm:px-8 sm:py-8"
        >
          {stateMessage ? (
            <div
              className={`rounded-2xl px-4 py-3 text-sm ${
                stateMessage.tone === "success"
                  ? "border border-emerald-500/25 bg-emerald-500/10 text-emerald-200"
                  : "border border-red-500/25 bg-red-500/10 text-red-200"
              }`}
            >
              {stateMessage.text}
            </div>
          ) : null}

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">Email</span>
            <input
              required
              type="email"
              name="email"
              autoComplete="email"
              placeholder="admin@example.com"
              className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/60 focus:bg-slate-900"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Send recovery email
          </button>
        </form>

        <div className="border-t border-white/10 px-6 py-4 text-sm text-slate-400 sm:px-8">
          <Link href="/login" className="transition hover:text-cyan-300">
            Вернуться к логину
          </Link>
        </div>
      </div>
    </main>
  );
}
