import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      // リクエストボディを取得
      const body = await request.json();
      const { next_wake_up_time, next_departure_time, next_arrival_time, appearance_photo_url, route_photo_url, notes } = body;

      // バリデーション
      if (!next_wake_up_time || !next_departure_time || !next_arrival_time) {
        return NextResponse.json({ error: { message: "翌日の予定時間をすべて入力してください" } }, { status: 400 });
      }

      if (!appearance_photo_url || !route_photo_url) {
        return NextResponse.json({ error: { message: "身だしなみ写真と経路スクリーンショットをアップロードしてください" } }, { status: 400 });
      }

      // 今日の日付を日本時間で取得
      const nowJST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
      const todayJSTString = nowJST.toISOString().split("T")[0]; // 今日の日付 (JST)

      // 報告対象日（翌日）を日本時間で計算
      const targetReportDateJST = new Date(nowJST);
      targetReportDateJST.setDate(nowJST.getDate() + 1); // 日本時間で翌日に設定
      const targetReportDateString = targetReportDateJST.toISOString().split("T")[0]; // 翌日の日付 (JST)

      // 新しいサイクルを開始するため、既存のattendance_recordをarchivedにする

      // 今日の既存のattendance_recordsをarchivedにする
      const { error: archiveError } = await (supabaseAdmin as any)
        .from("attendance_records")
        .update({
          status: "archived",
          updated_at: new Date().toISOString(),
        })
        .eq("staff_id", req.user.id)
        .eq("date", todayJSTString)
        .in("status", ["pending", "partial", "active", "complete"]);

      if (archiveError) {
        console.error("既存レコードのアーカイブエラー:", archiveError);
        // エラーでも続行（新しいサイクルを開始）
      }

      // 今日の既存の日報もarchivedにする
      const { error: reportArchiveError } = await (supabaseAdmin as any)
        .from("daily_reports")
        .update({
          status: "archived",
          updated_at: new Date().toISOString(),
        })
        .eq("staff_id", req.user.id)
        .eq("date", todayJSTString)
        .in("status", ["draft", "submitted"]);

      if (reportArchiveError) {
        console.error("既存日報のアーカイブエラー:", reportArchiveError);
        // エラーでも続行（新しいサイクルを開始）
      }

      // 常に新しい前日報告を作成
      const reportData = {
        user_id: req.user.id,
        report_date: targetReportDateString,
        next_wake_up_time,
        next_departure_time,
        next_arrival_time,
        appearance_photo_url,
        route_photo_url,
        notes: notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      console.log(`[PreviousDayReport POST] Inserting reportData: ${JSON.stringify(reportData, null, 2)}`);

      const { data: result, error } = await (supabaseAdmin as any).from("previous_day_reports").insert(reportData).select().single();

      if (error) {
        console.error("前日報告作成エラー:", error);
        return NextResponse.json({ error: { message: "前日報告の作成に失敗しました" } }, { status: 500 });
      }

      console.log(`Previous day report created/updated for user ${req.user.id}:`, {
        report_date: targetReportDateString,
        actual_attendance_record_id: result.actual_attendance_record_id,
        id: result.id,
      });

      return NextResponse.json({
        message: "前日報告が正常に送信されました",
        data: result,
      });
    } catch (error) {
      console.error("前日報告API エラー:", error);
      return NextResponse.json({ error: { message: "サーバーエラーが発生しました" } }, { status: 500 });
    }
  });
}

export async function GET(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      // 今日の日付を日本時間で取得
      const nowJST = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }));
      const todayDateString = nowJST.toISOString().split("T")[0];

      // 今日の前日報告を取得
      const { data: report, error } = await (supabaseAdmin as any)
        .from("previous_day_reports")
        .select("*")
        .eq("user_id", req.user.id)
        .eq("report_date", todayDateString)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("前日報告取得エラー:", error);
        return NextResponse.json({ error: { message: "データベースエラーが発生しました" } }, { status: 500 });
      }

      return NextResponse.json({
        report: report || null,
        hasReport: !!report,
      });
    } catch (error) {
      console.error("前日報告取得API エラー:", error);
      return NextResponse.json({ error: { message: "サーバーエラーが発生しました" } }, { status: 500 });
    }
  });
}
