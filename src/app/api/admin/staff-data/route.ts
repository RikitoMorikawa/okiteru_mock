import { NextRequest, NextResponse } from "next/server";
import { withManagerAuth } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withManagerAuth(request, async (req) => {
    try {
      const { searchParams } = new URL(request.url);
      const date = searchParams.get("date") || new Date().toISOString().split("T")[0];
      const staffId = searchParams.get("staffId");

      // Fetch all staff users
      const { data: users, error: usersError } = await (supabaseAdmin as any).from("users").select("*").eq("role", "staff");

      if (usersError) throw usersError;

      const staffDataPromises = (users || []).map(async (user: any) => {
        // Skip if specific staff is selected and this isn't the one
        if (staffId && staffId !== "all" && user.id !== staffId) {
          return null;
        }

        // Fetch attendance records for the selected date
        const { data: attendanceRecords } = await (supabaseAdmin as any).from("attendance_records").select("*").eq("staff_id", user.id).eq("date", date);

        // Fetch daily reports for the selected date
        const { data: dailyReports } = await (supabaseAdmin as any).from("daily_reports").select("*").eq("staff_id", user.id).eq("date", date);

        return {
          user,
          attendanceRecords: attendanceRecords || [],
          dailyReports: dailyReports || [],
        };
      });

      const results = await Promise.all(staffDataPromises);
      const staffData = results.filter(Boolean);

      return NextResponse.json({ staffData });
    } catch (error) {
      console.error("Error fetching staff data:", error);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "スタッフデータの取得に失敗しました",
          },
        },
        { status: 500 }
      );
    }
  });
}
