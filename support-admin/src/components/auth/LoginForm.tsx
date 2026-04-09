"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  initialAuthFormState,
  loginWithStateAction,
} from "@/app/login/actions";
import { AuthFormMessage } from "./AuthFormMessage";
import { AuthSubmitButton } from "./AuthSubmitButton";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    loginWithStateAction,
    initialAuthFormState,
  );

  return (
    <form action={formAction} className="space-y-5 px-6 py-6 sm:px-8 sm:py-8">
      <AuthFormMessage state={state} />

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-200">Email</span>
        <input
          required
          type="email"
          name="email"
          defaultValue={state.email}
          autoComplete="email"
          placeholder="admin@example.com"
          className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/60 focus:bg-slate-900"
        />
      </label>

      <label className="block">
        <span className="mb-2 block text-sm font-medium text-slate-200">Password</span>
        <input
          required
          type="password"
          name="password"
          autoComplete="current-password"
          placeholder="вЂўвЂўвЂўвЂўвЂўвЂўвЂўвЂў"
          className="w-full rounded-2xl border border-white/10 bg-slate-900/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/60 focus:bg-slate-900"
        />
      </label>

      <AuthSubmitButton
        idleLabel="Sign in"
        pending={pending}
        pendingLabel="Signing in..."
      />

      <div className="flex items-center justify-between gap-3 text-sm text-slate-400">
        <span>Р—Р°Р±С‹Р»Рё РїР°СЂРѕР»СЊ?</span>
        <Link href="/forgot-password" className="transition hover:text-cyan-300">
          Recovery
        </Link>
      </div>
    </form>
  );
}
