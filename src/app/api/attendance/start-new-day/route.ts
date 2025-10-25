import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Check if there's already a record for today
      const { data: existingRecord, error: fetchError } = await (supabaseAdmin as any)
        .from("attendance_records")
        .select("*")
        .eq("staff_id", req.user.id)
        .eq("date", today)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("Error fetching attendance record:", fetchError);
        return NextResponse.json({ error: "出勤記録の取得に失敗しました" }, { status: 500 });
      }

      // If there's an existing record for today
      if (existingRecord) {
        if (existingRecord.status === "complete") {
          // Mark the existing record as reset (for history tracking)
          await (supabaseAdmin as any)
            .from("attendance_records")
            .update({
              status: "reset",
              updated_at: new Date().toISOString(),
            })
            .eq("id", existingRecord.id);

          // Create a new active record for the new day
          const { error: createError } = await (supabaseAdmin as any).from("attendance_records").insert({
            staff_id: req.user.id,
            date: today,
            status: "active",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

          if (createError) {
            console.error("Error creating new attendance record:", createError);
            return NextResponse.json({ error: "新しい出勤記録の作成に失敗しました" }, { status: 500 });
          }

          // Also delete any daily reports for today to start fresh
          const { error: reportResetError } = await (supabaseAdmin as any).from("daily_reports").delete().eq("staff_id", req.user.id).eq("date", today);

          if (reportResetError) {
            console.error("Error resetting daily reports:", reportResetError);
            // Don't return error here as this is not critical
          }

          console.log(`New day started for user ${req.user.id} on ${today} (created new record)`);
        } else {
          // Record exists but not completed, no need to reset
          return NextResponse.json({
            success: true,
            message: "本日の記録は既にアクティブです",
            alreadyActive: true,
          });
        }
      } else {
        // Create a new record for today
        const { error: createError } = await (supabaseAdmin as any).from("attendance_records").insert({
          staff_id: req.user.id,
          date: today,
          status: "active",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (createError) {
          console.error("Error creating new attendance record:", createError);
          return NextResponse.json({ error: "新しい出勤記録の作成に失敗しました" }, { status: 500 });
        }

        console.log(`New attendance record created for user ${req.user.id} on ${today}`);
      }

      return NextResponse.json({
        success: true,
        message: "新しい日を開始しました！本日もお疲れ様です。",
        date: today,
        reset: true,
      });
    } catch (error) {
      console.error("Error starting new day:", error);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "新しい日の開始に失敗しました",
          },
        },
        { status: 500 }
      );
    }
  });
}
