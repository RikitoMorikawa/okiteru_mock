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
        .select("id, wake_up_time, departure_time, arrival_time, status")
        .eq("staff_id", req.user.id)
        .eq("date", dateStr)
        .order("created_at", { ascending: false });

      // Find the latest active or complete record (exclude only archived records)
      const attendanceRecord = attendanceRecords?.find((record: any) => ["pending", "partial", "active", "complete"].includes(record.status)) || null;

      // Get previous day report for today's progress
      // 今日の進捗として、今日のattendance_recordに紐づいた前日報告があるかチェック
      let previousDayReport = null;

      // まず、今日のattendance_recordに紐づいた前日報告を確認
      if (attendanceRecord) {
        const { data: linkedReport } = await (supabaseAdmin as any)
          .from("previous_day_reports")
          .select("id, report_date, actual_attendance_record_id, created_at")
          .eq("user_id", req.user.id)
          .eq("actual_attendance_record_id", attendanceRecord.id)
          .single();

        if (linkedReport) {
          previousDayReport = linkedReport;
        }
      }

      // 紐づいた前日報告がない場合、未使用の前日報告を確認
      if (!previousDayReport) {
        const { data: unusedReports } = await (supabaseAdmin as any)
          .from("previous_day_reports")
          .select("id, report_date, actual_attendance_record_id, created_at")
          .eq("user_id", req.user.id)
          .is("actual_attendance_record_id", null)
          .order("created_at", { ascending: false });

        previousDayReport = unusedReports?.[0] || null;
      }

      console.log(`Previous day reports search for user ${req.user.id}:`, {
        attendanceRecordId: attendanceRecord?.id,
        linkedReport: !!previousDayReport && !!previousDayReport.actual_attendance_record_id,
        unusedReport: !!previousDayReport && !previousDayReport.actual_attendance_record_id,
        selectedReport: previousDayReport,
      });

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
        dayCompleted: (attendanceRecord?.status === "archived" || attendanceRecord?.status === "complete") && attendanceRecord !== null,
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
