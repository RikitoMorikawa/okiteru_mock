import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Step 1: Complete today's records

      // Get attendance record for today
      const { data: attendanceRecord, error: fetchError } = await (supabaseAdmin as any)
        .from("attendance_records")
        .select("*")
        .eq("staff_id", req.user.id)
        .eq("date", today)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("Error fetching attendance record:", fetchError);
        return NextResponse.json({ error: "出勤記録の取得に失敗しました" }, { status: 500 });
      }

      // If attendance record exists, update its status to complete
      if (attendanceRecord) {
        const { error: updateError } = await (supabaseAdmin as any)
          .from("attendance_records")
          .update({
            status: "complete",
            updated_at: new Date().toISOString(),
          })
          .eq("id", attendanceRecord.id);

        if (updateError) {
          console.error("Error updating attendance record:", updateError);
          return NextResponse.json({ error: "出勤記録の更新に失敗しました" }, { status: 500 });
        }
      }

      // Mark any draft reports as submitted (if they exist)
      const { error: reportUpdateError } = await (supabaseAdmin as any)
        .from("daily_reports")
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("staff_id", req.user.id)
        .eq("date", today)
        .eq("status", "draft");

      if (reportUpdateError) {
        console.error("Error updating daily reports:", reportUpdateError);
        // Don't return error here as this is not critical
      }

      // Step 2: Reset today's data for immediate reset effect
      // This approach gives users immediate visual feedback by clearing today's data

      // Delete today's attendance record to reset it
      if (attendanceRecord) {
        const { error: deleteAttendanceError } = await (supabaseAdmin as any).from("attendance_records").delete().eq("id", attendanceRecord.id);

        if (deleteAttendanceError) {
          console.error("Error deleting today's attendance record:", deleteAttendanceError);
        }
      }

      // Delete today's daily reports to reset them
      const { error: deleteReportError } = await (supabaseAdmin as any).from("daily_reports").delete().eq("staff_id", req.user.id).eq("date", today);

      if (deleteReportError) {
        console.error("Error deleting today's reports:", deleteReportError);
      }

      // Step 3: Clean up any future records as well
      const { error: deleteFutureAttendanceError } = await (supabaseAdmin as any)
        .from("attendance_records")
        .delete()
        .eq("staff_id", req.user.id)
        .gt("date", today);

      if (deleteFutureAttendanceError) {
        console.error("Error deleting future attendance records:", deleteFutureAttendanceError);
      }

      const { error: deleteFutureReportsError } = await (supabaseAdmin as any).from("daily_reports").delete().eq("staff_id", req.user.id).gt("date", today);

      if (deleteFutureReportsError) {
        console.error("Error deleting future reports:", deleteFutureReportsError);
      }

      return NextResponse.json({
        success: true,
        message: "本日の業務を完了しました。お疲れ様でした！システムがリセットされました。",
        reset: true,
      });
    } catch (error) {
      console.error("Error completing day:", error);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "業務完了処理に失敗しました",
          },
        },
        { status: 500 }
      );
    }
  });
}
