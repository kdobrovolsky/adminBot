"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

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

export async function loginAction(formData: FormData): Promise<void> {
  const email = formData.get("email");
  const password = formData.get("password");

  if (typeof email !== "string" || typeof password !== "string") {
    redirect("/login?error=invalid-form");
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect("/login?error=invalid-credentials");
  }

  redirect("/");
}

export async function logoutAction(): Promise<void> {
  const supabase = await createServerSupabaseClient();

  await supabase.auth.signOut();
  redirect("/login");
}

export async function forgotPasswordAction(formData: FormData): Promise<void> {
  const email = formData.get("email");

  if (typeof email !== "string") {
    redirect("/forgot-password?error=invalid-form");
  }

  const supabase = await createServerSupabaseClient();
  const headersList = await headers();
  const origin = getRequestOrigin(headersList);
  // Recovery emails must return to this app first so we can create a cookie session.
  const redirectTo = new URL("/auth/callback?next=/reset-password", origin).toString();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    redirect("/forgot-password?error=request-failed");
  }

  redirect("/forgot-password?success=sent");
}

export async function resetPasswordAction(formData: FormData): Promise<void> {
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  if (
    typeof password !== "string" ||
    typeof confirmPassword !== "string" ||
    password.length < 8
  ) {
    redirect("/reset-password?error=invalid-password");
  }

  if (password !== confirmPassword) {
    redirect("/reset-password?error=password-mismatch");
  }

  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Password updates are allowed only inside the recovery session.
  if (!user) {
    redirect("/login?error=recovery-session-missing");
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    redirect("/reset-password?error=update-failed");
  }

  redirect("/?passwordReset=success");
}
