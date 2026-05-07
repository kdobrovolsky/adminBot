import { DashboardHeader } from "@/components/messages/DashboardHeader";
import { MessagesDashboard } from "@/components/messages/MessagesDashboard";
import {getDashboardData} from "@/features/dashbord/api/getDashboardData";

export const dynamic = "force-dynamic";

export default async function Home() {
  const { currentManagerId, currentUserId, dialogs, errorMessage, managers } =
      await getDashboardData();

  return (
      <main className="min-h-screen px-3 py-4 text-slate-100 sm:px-4 sm:py-5 lg:px-6 lg:py-6">
        <div className="mx-auto flex w-full max-w-[92rem] flex-col gap-4 sm:gap-5">
          <DashboardHeader />

          {errorMessage ? (
              <section className="rounded-[1rem] border border-red-500/20 bg-[linear-gradient(180deg,rgba(69,10,10,0.48),rgba(127,29,29,0.18))] px-4 py-3 shadow-[0_12px_34px_rgba(69,10,10,0.14)] sm:px-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-red-300">
                  Data Error
                </p>
                <p className="mt-2 text-sm leading-6 text-red-200">{errorMessage}</p>
              </section>
          ) : null}

          <MessagesDashboard
              currentManagerId={currentManagerId}
              currentUserId={currentUserId}
              dialogs={dialogs}
              managers={managers}
          />
        </div>
      </main>
  );
}