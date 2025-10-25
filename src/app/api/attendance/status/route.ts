import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      // Get today's date
      const today = new Date();
      const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD format

      // Get attendance record for today
      const { data: attendanceRecord } = await (supabaseAdmin as any)
        .from("attendance_records")
        .select("wake_up_time, departure_time, arrival_time, status")
        .eq("staff_id", req.user.id)
        .eq("date", dateStr)
        .single();

      // Get daily report for today
      const { data: dailyReport } = await (supabaseAdmin as any).from("daily_reports").select("id").eq("staff_id", req.user.id).eq("date", dateStr).single();

      // Get shift schedule for today (optional - might not exist)
      const { data: shiftSchedule } = await (supabaseAdmin as any)
        .from("shift_schedules")
        .select("id")
        .eq("staff_id", req.user.id)
        .eq("date", dateStr)
        .single();

      // Build status object
      const status = {
        wakeUpReported: !!attendanceRecord?.wake_up_time,
        departureReported: !!attendanceRecord?.departure_time,
        arrivalReported: !!attendanceRecord?.arrival_time,
        dailyReportSubmitted: !!dailyReport,
        shiftScheduleSubmitted: !!shiftSchedule,
        dayCompleted: attendanceRecord?.status === "complete",
      };

      // Debug logging
      console.log(`Attendance status for user ${req.user.id} on ${dateStr}:`, {
        attendanceRecord: attendanceRecord ? { ...attendanceRecord } : null,
        status,
      });

      return NextResponse.json({
        status,
        attendanceRecord,
        dailyReport,
        shiftSchedule,
      });
    } catch (error) {
      console.error("Get attendance status error:", error);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "出席状況の取得に失敗しました",
          },
        },
        { status: 500 }
      );
    }
  });
}
