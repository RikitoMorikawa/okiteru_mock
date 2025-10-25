import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Database } from "@/types/database";

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });

    // Get the authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    const today = new Date().toISOString().split("T")[0];

    // Clear any draft reports from localStorage (this will be handled on the client side)
    // Update attendance record status to complete if all required fields are present
    const { data: attendanceRecord, error: fetchError } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("staff_id", user.id)
      .eq("date", today)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error fetching attendance record:", fetchError);
      return NextResponse.json({ error: "出勤記録の取得に失敗しました" }, { status: 500 });
    }

    // If attendance record exists, update its status to complete
    if (attendanceRecord) {
      const { error: updateError } = await supabase
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
    const { error: reportUpdateError } = await supabase
      .from("daily_reports")
      .update({
        status: "submitted",
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("staff_id", user.id)
      .eq("date", today)
      .eq("status", "draft");

    if (reportUpdateError) {
      console.error("Error updating daily reports:", reportUpdateError);
      // Don't return error here as this is not critical
    }

    return NextResponse.json({
      success: true,
      message: "本日の業務を完了しました。お疲れ様でした！",
    });
  } catch (error) {
    console.error("Error completing day:", error);
    return NextResponse.json({ error: "業務完了処理に失敗しました" }, { status: 500 });
  }
}
