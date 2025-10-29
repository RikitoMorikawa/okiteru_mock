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

      // Get the latest active attendance record for today
      const { data: attendanceRecords } = await (supabaseAdmin as any)
        .from("attendance_records")
        .select("wake_up_time, departure_time, arrival_time, status")
        .eq("staff_id", req.user.id)
        .eq("date", dateStr)
        .order("created_at", { ascending: false });

      // Get unused previous day report (actual_attendance_record_idが未設定の前日報告を取得)
      // 前日報告は一度作成したら、attendance_recordに紐づけられるまで有効
      const { data: previousDayReports } = await (supabaseAdmin as any)
        .from("previous_day_reports")
        .select("id, report_date, actual_attendance_record_id, created_at")
        .eq("user_id", req.user.id)
        .is("actual_attendance_record_id", null)
        .order("created_at", { ascending: false });

      const previousDayReport = previousDayReports?.[0] || null;

      console.log(`Previous day reports search for user ${req.user.id}:`, {
        totalFound: previousDayReports?.length || 0,
        reports: previousDayReports || [],
        selectedReport: previousDayReport,
      });

      // Find the latest active record (exclude archived records)
      const attendanceRecord = attendanceRecords?.find((record: any) => ["pending", "partial", "active", "complete"].includes(record.status)) || null;

      // Get the latest active daily report for today (exclude archived reports)
      const { data: dailyReports } = await (supabaseAdmin as any)
        .from("daily_reports")
        .select("id, status")
        .eq("staff_id", req.user.id)
        .eq("date", dateStr)
        .in("status", ["draft", "submitted"]) // archivedは除外
        .order("created_at", { ascending: false });

      const dailyReport = dailyReports?.[0] || null;

      // Get shift schedule for today (optional - might not exist)
      const { data: shiftSchedule } = await (supabaseAdmin as any)
        .from("shift_schedules")
        .select("id")
        .eq("staff_id", req.user.id)
        .eq("date", dateStr)
        .single();

      // Build status object
      const status = {
        previousDayReported: !!previousDayReport,
        wakeUpReported: !!attendanceRecord?.wake_up_time,
        departureReported: !!attendanceRecord?.departure_time,
        arrivalReported: !!attendanceRecord?.arrival_time,
        dailyReportSubmitted: !!dailyReport,
        shiftScheduleSubmitted: !!shiftSchedule,
        dayCompleted: attendanceRecord?.status === "archived" && attendanceRecord !== null,
      };

      // Debug logging
      console.log(`Attendance status for user ${req.user.id} on ${dateStr}:`, {
        attendanceRecord: attendanceRecord ? { ...attendanceRecord } : null,
        previousDayReport: previousDayReport ? { ...previousDayReport } : null,
        dailyReport: dailyReport ? { ...dailyReport } : null,
        status,
      });

      return NextResponse.json({
        status,
        attendanceRecord,
        dailyReport,
        shiftSchedule,
        previousDayReport,
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
