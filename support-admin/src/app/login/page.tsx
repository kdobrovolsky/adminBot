import Link from "next/link";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { loginAction } from "./actions";

export const metadata = {
  title: "Login | SupportBot Admin",
  description: "Login page for SupportBot Admin",
};

type LoginPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

function getErrorMessage(error?: string) {
  if (error === "invalid-form") {
    return "Проверьте форму и попробуйте снова.";
  }

  if (error === "invalid-credentials") {
    return "Неверный email или password.";
  }

  if (error === "recovery-session-missing") {
    return "Сессия восстановления не найдена. Запросите recovery-письмо заново.";
  }

  return null;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorMessage = getErrorMessage(resolvedSearchParams?.error);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8 text-slate-100 sm:px-6">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur">
        <div className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(14,116,144,0.28),rgba(15,23,42,0.16))] px-6 py-6 sm:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
            SupportBot Admin
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            Login
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Введите email и password для входа в админку. Сессия хранится в
            cookie через Supabase SSR.
          </p>
        </div>

        <form action={loginAction} className="space-y-5 px-6 py-6 sm:px-8 sm:py-8">
          {errorMessage ? (
            <div className="rounded-2xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {errorMessage}
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

          <label className="block">
            <span className="mb-2 block text-sm font-medium text-slate-200">
              Password
            </span>
            <input
              required
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/60 focus:bg-slate-900"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Sign in
          </button>

          <div className="flex items-center justify-between gap-3 text-sm text-slate-400">
            <span>Забыли пароль?</span>
            <Link href="/forgot-password" className="transition hover:text-cyan-300">
              Recovery
            </Link>
          </div>
        </form>

        <div className="border-t border-white/10 px-6 py-4 text-sm text-slate-400 sm:px-8">
          <Link href="/" className="transition hover:text-cyan-300">
            Назад в админку
          </Link>
        </div>
      </div>
    </main>
  );
}
