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
      const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD format

      // Get yesterday's date
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];

      // First, check if there's any data for today
      const { data: todayRecords } = await (supabaseAdmin as any)
        .from("attendance_records")
        .select("wake_up_time, departure_time, arrival_time, status, date")
        .eq("staff_id", req.user.id)
        .eq("date", todayStr)
        .order("created_at", { ascending: false });

      const todayRecord = todayRecords?.find((record: any) => ["pending", "partial", "active", "complete"].includes(record.status)) || null;

      // If no today's record, check for incomplete yesterday's record
      let displayRecord = todayRecord;
      let displayDate = todayStr;
      let isShowingPreviousDay = false;

      if (!todayRecord) {
        const { data: yesterdayRecords } = await (supabaseAdmin as any)
          .from("attendance_records")
          .select("wake_up_time, departure_time, arrival_time, status, date")
          .eq("staff_id", req.user.id)
          .eq("date", yesterdayStr)
          .order("created_at", { ascending: false });

        const incompleteYesterdayRecord =
          yesterdayRecords?.find((record: any) => ["pending", "partial", "active"].includes(record.status) && record.status !== "complete") || null;

        if (incompleteYesterdayRecord) {
          displayRecord = incompleteYesterdayRecord;
          displayDate = yesterdayStr;
          isShowingPreviousDay = true;
        }
      }

      // Get daily report for the display date
      const { data: dailyReports } = await (supabaseAdmin as any)
        .from("daily_reports")
        .select("id, status")
        .eq("staff_id", req.user.id)
        .eq("date", displayDate)
        .in("status", ["draft", "submitted"])
        .order("created_at", { ascending: false });

      const dailyReport = dailyReports?.[0] || null;

      // Get shift schedule for the display date
      const { data: shiftSchedule } = await (supabaseAdmin as any)
        .from("shift_schedules")
        .select("id")
        .eq("staff_id", req.user.id)
        .eq("date", displayDate)
        .single();

      // Build status object
      const status = {
        wakeUpReported: !!displayRecord?.wake_up_time,
        departureReported: !!displayRecord?.departure_time,
        arrivalReported: !!displayRecord?.arrival_time,
        dailyReportSubmitted: !!dailyReport,
        shiftScheduleSubmitted: !!shiftSchedule,
        dayCompleted: displayRecord?.status === "complete" && displayRecord !== null,
      };

      // Debug logging
      console.log(`Attendance status for user ${req.user.id} on ${displayDate}:`, {
        displayRecord: displayRecord ? { ...displayRecord } : null,
        status,
        isShowingPreviousDay,
      });

      return NextResponse.json({
        status,
        attendanceRecord: displayRecord,
        dailyReport,
        shiftSchedule,
        date: displayDate,
        isToday: displayDate === todayStr,
        isShowingPreviousDay,
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
