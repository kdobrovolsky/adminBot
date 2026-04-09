import { redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
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
    <AuthPageShell
      title="New password"
      description={`Установите новый пароль для аккаунта ${user.email ?? ""}.`}
      backHref="/"
      backLabel="Назад в админку"
    >
      <ResetPasswordForm />
    </AuthPageShell>
  );
}
