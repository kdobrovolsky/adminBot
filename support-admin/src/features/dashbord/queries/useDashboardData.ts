"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchDashboardData } from "@/features/dashbord/api/fetchDashboardData";
import { dashboardQueryKey } from "@/features/dashbord/queryKeys";
import type { DashboardDataResult } from "@/types/message";

export function useDashboardData(initialData: DashboardDataResult) {
  return useQuery({
    initialData,
    queryFn: fetchDashboardData,
    queryKey: dashboardQueryKey,
  });
}
