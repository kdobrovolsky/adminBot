import { AdminWorkspace } from "@/components/admin/AdminWorkspace";
import { getDashboardData } from "@/features/dashbord/api/getDashboardData";

export const dynamic = "force-dynamic";

export default async function Home() {
  const dashboardData = await getDashboardData();

  return (
    <main className="min-h-screen px-3 py-4 text-slate-100 sm:px-4 sm:py-5 lg:px-6 lg:py-6">
      <div className="mx-auto flex w-full max-w-[92rem] flex-col gap-4 sm:gap-5">
        <AdminWorkspace initialData={dashboardData} />
      </div>
    </main>
  );
}
