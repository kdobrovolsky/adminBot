"use client";

import { useActionState } from "react";
import { resetPasswordWithStateAction } from "@/app/login/actions";
import { AuthFormMessage } from "./AuthFormMessage";
import { AuthSubmitButton } from "./AuthSubmitButton";
import { initialAuthFormState } from "./authFormState";

export function ResetPasswordForm() {
  const [state, formAction, pending] = useActionState(
    resetPasswordWithStateAction,
    initialAuthFormState,
  );

  return (
    <form action={formAction} className="space-y-5 px-6 py-6 sm:px-8 sm:py-8">
      <AuthFormMessage state={state} />

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-200">
          New password
        </span>
        <input
          required
          minLength={8}
          type="password"
          name="password"
          autoComplete="new-password"
          placeholder="••••••••"
          className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/60 focus:bg-slate-900"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-200">
          Confirm password
        </span>
        <input
          required
          minLength={8}
          type="password"
          name="confirmPassword"
          autoComplete="new-password"
          placeholder="••••••••"
          className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/60 focus:bg-slate-900"
        />
      </label>

      <AuthSubmitButton
        idleLabel="Update password"
        pending={pending}
        pendingLabel="Updating..."
      />
    </form>
  );
}
