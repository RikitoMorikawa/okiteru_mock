import { NextRequest, NextResponse } from "next/server";
import { withManagerAuth } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withManagerAuth(request, async (req) => {
    try {
      const { searchParams } = new URL(request.url);
      const date = searchParams.get("date") || getTodayJST();
      const staffId = searchParams.get("staffId");

      console.log("[admin/staff-data] Request params:", {
        requestedDate: searchParams.get("date"),
        finalDate: date,
        todayJST: getTodayJST(),
        staffId,
      });

      // Fetch all staff users
      const { data: users, error: usersError } = await (supabaseAdmin as any).from("users").select("*").eq("role", "staff");

      if (usersError) throw usersError;

      const staffDataPromises = (users || []).map(async (user: any) => {
        // Skip if specific staff is selected and this isn't the one
        if (staffId && staffId !== "all" && user.id !== staffId) {
          return null;
        }

        // Fetch attendance records for the selected date ONLY
        const { data: attendanceRecords } = await (supabaseAdmin as any).from("attendance_records").select("*").eq("staff_id", user.id).eq("date", date);

        // Fetch daily reports for the selected date ONLY
        const { data: dailyReports } = await (supabaseAdmin as any).from("daily_reports").select("*").eq("staff_id", user.id).eq("date", date);

        // Always return user data, even if no records exist for the selected date
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
