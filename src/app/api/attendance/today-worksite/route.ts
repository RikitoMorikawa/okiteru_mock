import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * GET /api/attendance/today-worksite
 *
 * 今日のスタッフの勤務予定現場を取得
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      // Get today's date in JST
      const nowJST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
      const todayJSTString = nowJST.toISOString().split("T")[0]; // YYYY-MM-DD

      // Get today's staff availability for this user
      const { data: availability, error: availabilityError } = await (supabaseAdmin as any)
        .from("staff_availability")
        .select(`
          id,
          date,
          worksite_id,
          notes,
          worksite:worksites (
            id,
            name,
            address,
            description
          )
        `)
        .eq("staff_id", req.user.id)
        .eq("date", todayJSTString)
        .single();

      if (availabilityError && availabilityError.code !== "PGRST116") {
        console.error("Error fetching staff availability:", availabilityError);
        return NextResponse.json(
          { error: { message: "スタッフの出社予定の取得に失敗しました" } },
          { status: 500 }
        );
      }

      // If no availability record or no worksite assigned
      if (!availability || !availability.worksite_id) {
        return NextResponse.json({
          hasWorksite: false,
          worksite: null,
          message: "本日の勤務予定現場が設定されていません",
        });
      }

      return NextResponse.json({
        hasWorksite: true,
        worksite: availability.worksite,
        availability: {
          id: availability.id,
          date: availability.date,
          notes: availability.notes,
        },
      });
    } catch (error) {
      console.error("Error in today-worksite API:", error);
      return NextResponse.json(
        { error: { message: "サーバーエラーが発生しました" } },
        { status: 500 }
      );
    }
  });
}
