import { NextResponse } from "next/server";
import { loadDashboardData } from "@/features/dashbord/api/getDashboardData";

export async function GET() {
  const result = await loadDashboardData({ redirectOnUnauthenticated: false });

  if (!result) {
    return NextResponse.json(
      {
        error: "Unauthorized",
      },
      { status: 401 },
    );
  }

  return NextResponse.json(result);
}
