import { redirect } from "next/navigation";
import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { LoginForm } from "@/components/auth/LoginForm";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Login | SupportBot Admin",
  description: "Login page for SupportBot Admin",
};

export default async function LoginPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/");
  }

  return (
    <AuthPageShell
      title="Login"
      description="Введите email и пароль для входа в админку. Сессия хранится в cookie через Supabase SSR."
      backHref="/"
      backLabel="Назад в админку"
    >
      <LoginForm />
    </AuthPageShell>
  );
}
