import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      const today = new Date().toISOString().split("T")[0];

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

      // If attendance record exists and is complete, reopen it
      if (attendanceRecord && attendanceRecord.status === "complete") {
        const { error: updateError } = await (supabaseAdmin as any)
          .from("attendance_records")
          .update({
            status: "active",
            updated_at: new Date().toISOString(),
          })
          .eq("id", attendanceRecord.id);

        if (updateError) {
          console.error("Error updating attendance record:", updateError);
          return NextResponse.json({ error: "出勤記録の更新に失敗しました" }, { status: 500 });
        }
      }

      // Reopen any submitted reports back to draft status
      const { error: reportUpdateError } = await (supabaseAdmin as any)
        .from("daily_reports")
        .update({
          status: "draft",
          submitted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("staff_id", req.user.id)
        .eq("date", today)
        .eq("status", "submitted");

      if (reportUpdateError) {
        console.error("Error updating daily reports:", reportUpdateError);
        // Don't return error here as this is not critical
      }

      console.log(`Day reopened for user ${req.user.id} on ${today}`);

      return NextResponse.json({
        success: true,
        message: "業務を再開しました",
        reopenedDate: today,
      });
    } catch (error) {
      console.error("Error reopening day:", error);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "業務再開処理に失敗しました",
          },
        },
        { status: 500 }
      );
    }
  });
}
