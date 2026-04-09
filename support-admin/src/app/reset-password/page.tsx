import Link from "next/link";
import { redirect } from "next/navigation";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Reset Password | SupportBot Admin",
  description: "Reset password page for SupportBot Admin",
};

export default async function ResetPasswordPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8 text-slate-100 sm:px-6">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur">
        <div className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(14,116,144,0.28),rgba(15,23,42,0.16))] px-6 py-6 sm:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
            SupportBot Admin
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
            New password
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">
            Установите новый пароль для аккаунта {user.email ?? ""}.
          </p>
        </div>

        <ResetPasswordForm />

        <div className="border-t border-white/10 px-6 py-4 text-sm text-slate-400 sm:px-8">
          <Link href="/" className="transition hover:text-cyan-300">
            Назад в админку
          </Link>
        </div>
      </div>
    </main>
  );
}
