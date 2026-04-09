import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export const metadata = {
  title: "Recovery | SupportBot Admin",
  description: "Password recovery page for SupportBot Admin",
};

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell
      title="Recovery"
      description="Введите email. Supabase отправит письмо со ссылкой на сброс пароля."
      backHref="/login"
      backLabel="Вернуться к логину"
    >
      <ForgotPasswordForm />
    </AuthPageShell>
  );
}
