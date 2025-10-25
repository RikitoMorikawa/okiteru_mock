import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Check if there's already an active record for today
      const { data: existingRecords, error: fetchError } = await (supabaseAdmin as any)
        .from("attendance_records")
        .select("*")
        .eq("staff_id", req.user.id)
        .eq("date", today)
        .order("created_at", { ascending: false });

      if (fetchError) {
        console.error("Error fetching attendance records:", fetchError);
        return NextResponse.json({ error: "出勤記録の取得に失敗しました" }, { status: 500 });
      }

      // Find the latest active record and the latest complete record
      const activeRecord = existingRecords?.find((record) => ["pending", "partial", "active"].includes(record.status));
      const completeRecord = existingRecords?.find((record) => record.status === "complete");

      // If there's already an active record, don't create a new one
      if (activeRecord) {
        return NextResponse.json({
          success: true,
          message: "本日の記録は既にアクティブです",
          alreadyActive: true,
        });
      }

      // If there's a complete record, don't reset it automatically
      if (completeRecord) {
        return NextResponse.json({
          success: true,
          message: "本日の業務は既に完了しています",
          alreadyCompleted: true,
        });
      }

      // If no records exist for today, create a new one
      if (!existingRecords || existingRecords.length === 0) {
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
        message: "新しい日の準備が完了しました",
        date: today,
      });
    } catch (error) {
      console.error("Error resetting for new day:", error);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "新しい日の準備に失敗しました",
          },
        },
        { status: 500 }
      );
    }
  });
}
