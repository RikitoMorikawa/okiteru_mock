import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getTodayJST } from "@/utils/dateUtils";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      const today = getTodayJST();

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
      } else {
        // Create a new attendance record with complete status if none exists
        const { error: createError } = await (supabaseAdmin as any).from("attendance_records").insert({
          staff_id: req.user.id,
          date: today,
          status: "complete",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (createError) {
          console.error("Error creating completed attendance record:", createError);
          return NextResponse.json({ error: "完了記録の作成に失敗しました" }, { status: 500 });
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

      // Step 2: Mark the day as completed (data preservation approach)
      // All data is preserved for management review, but UI shows as completed

      // No data deletion - everything is preserved for admin management
      console.log(`Day completed for user ${req.user.id} on ${today}. All data preserved.`);

      return NextResponse.json({
        success: true,
        message: "本日の業務を完了しました。お疲れ様でした！",
        reset: true,
        completedDate: today,
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
