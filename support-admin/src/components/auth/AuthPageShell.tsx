import type { ReactNode } from "react";
import Link from "next/link";

type AuthPageShellProps = {
  title: string;
  description: string;
  backHref: string;
  backLabel: string;
  children: ReactNode;
};

export function AuthPageShell({
  title,
  description,
  backHref,
  backLabel,
  children,
}: AuthPageShellProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8 text-slate-100 sm:px-6">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-slate-950/70 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur">
        <div className="border-b border-white/10 bg-[linear-gradient(135deg,rgba(14,116,144,0.28),rgba(15,23,42,0.16))] px-6 py-6 sm:px-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-300/80">
            SupportBot Admin
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">{title}</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
        </div>

        {children}

        <div className="border-t border-white/10 px-6 py-4 text-sm text-slate-400 sm:px-8">
          <Link href={backHref} className="transition hover:text-cyan-300">
            {backLabel}
          </Link>
        </div>
      </div>
    </main>
  );
}
