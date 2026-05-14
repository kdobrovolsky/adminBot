import type { DashboardDataResult } from "@/types/message";

export async function fetchDashboardData(): Promise<DashboardDataResult> {
  const response = await fetch("/api/dashboard", {
    cache: "no-store",
    credentials: "same-origin",
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Failed to load dashboard data.");
  }

  return (await response.json()) as DashboardDataResult;
}
