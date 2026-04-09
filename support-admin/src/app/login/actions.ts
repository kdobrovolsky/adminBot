"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AuthFormState = {
  error: string | null;
  success: string | null;
  email: string;
};

export const initialAuthFormState: AuthFormState = {
  error: null,
  success: null,
  email: "",
};

function getRequestOrigin(headersList: Headers) {
  const origin = headersList.get("origin");

  if (origin) {
    return origin;
  }

  const protocol = headersList.get("x-forwarded-proto") ?? "http";
  const host = headersList.get("x-forwarded-host") ?? headersList.get("host");

  if (!host) {
    throw new Error("Missing request host header.");
  }

  return `${protocol}://${host}`;
}

export async function loginWithStateAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    return {
      error: "Проверьте форму и попробуйте снова.",
      success: null,
      email: typeof email === "string" ? email : "",
    };
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return {
      error: "Неверный email или password.",
      success: null,
      email,
    };
  }

  redirect("/");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();

  await supabase.auth.signOut();
  redirect("/login");
}

export async function forgotPasswordWithStateAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const email = formData.get("email");

  if (typeof email !== "string") {
    return {
      error: "Проверьте email и попробуйте снова.",
      success: null,
      email: "",
    };
  }

  const supabase = await createServerSupabaseClient();
  const headersList = await headers();
  const origin = getRequestOrigin(headersList);
  const redirectTo = new URL("/auth/callback?next=/reset-password", origin).toString();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    return {
      error: "Не удалось отправить письмо для восстановления пароля.",
      success: null,
      email,
    };
  }

  return {
    error: null,
    success:
      "Если пользователь существует, письмо со ссылкой на сброс уже отправлено.",
    email,
  };
}

export async function resetPasswordWithStateAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  if (
    typeof password !== "string" ||
    typeof confirmPassword !== "string" ||
    password.length < 8
  ) {
    return {
      error: "Пароль должен содержать минимум 8 символов.",
      success: null,
      email: "",
    };
  }

  if (password !== confirmPassword) {
    return {
      error: "Пароли не совпадают.",
      success: null,
      email: "",
    };
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error:
        "Сессия восстановления не найдена. Запросите recovery-письмо заново.",
      success: null,
      email: "",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return {
      error:
        "Не удалось обновить пароль. Попробуйте открыть recovery-ссылку заново.",
      success: null,
      email: "",
    };
  }

  redirect("/?passwordReset=success");
}
