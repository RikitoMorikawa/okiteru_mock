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

      // If no record exists for today, create a new one
      if (fetchError && fetchError.code === "PGRST116") {
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
      } else if (existingRecord && existingRecord.status === "complete") {
        // If today's record is complete, don't reset it
        return NextResponse.json({
          success: true,
          message: "本日の業務は既に完了しています",
          alreadyCompleted: true,
        });
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
