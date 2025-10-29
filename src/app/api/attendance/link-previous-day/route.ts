import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

/**
 * 前日報告と実際の出勤記録を関連付けるAPI
 * 出勤記録が作成された際に、前日の報告と自動的にリンクする
 */
export async function POST(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      const body = await request.json();
      const { attendance_record_id, report_date } = body;

      if (!attendance_record_id) {
        return NextResponse.json({ error: { message: "出勤記録IDが必要です" } }, { status: 400 });
      }

      // 出勤記録の存在確認
      const { data: attendanceRecord, error: attendanceError } = await (supabaseAdmin as any)
        .from("attendance_records")
        .select("id, staff_id, date")
        .eq("id", attendance_record_id)
        .eq("staff_id", req.user.id)
        .single();

      if (attendanceError || !attendanceRecord) {
        return NextResponse.json({ error: { message: "出勤記録が見つかりません" } }, { status: 404 });
      }

      // 前日の日付を計算（report_dateが指定されていない場合は出勤記録の前日）
      let previousDayDate: string;
      if (report_date) {
        previousDayDate = report_date;
      } else {
        const recordDate = new Date(attendanceRecord.date);
        recordDate.setDate(recordDate.getDate() - 1);
        previousDayDate = recordDate.toISOString().split("T")[0];
      }

      // 前日報告を検索
      const { data: previousDayReport, error: reportError } = await (supabaseAdmin as any)
        .from("previous_day_reports")
        .select("id, actual_attendance_record_id")
        .eq("user_id", req.user.id)
        .eq("report_date", previousDayDate)
        .single();

      if (reportError && reportError.code !== "PGRST116") {
        console.error("前日報告検索エラー:", reportError);
        return NextResponse.json({ error: { message: "前日報告の検索に失敗しました" } }, { status: 500 });
      }

      if (!previousDayReport) {
        return NextResponse.json({ error: { message: "対応する前日報告が見つかりません" } }, { status: 404 });
      }

      // 既にリンクされている場合はスキップ
      if (previousDayReport.actual_attendance_record_id) {
        return NextResponse.json({
          message: "既にリンクされています",
          linked: true,
          previous_day_report_id: previousDayReport.id,
          attendance_record_id: attendance_record_id,
        });
      }

      // 前日報告に出勤記録IDを設定
      const { data: updatedReport, error: updateError } = await (supabaseAdmin as any)
        .from("previous_day_reports")
        .update({
          actual_attendance_record_id: attendance_record_id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", previousDayReport.id)
        .select()
        .single();

      if (updateError) {
        console.error("前日報告更新エラー:", updateError);
        return NextResponse.json({ error: { message: "前日報告の更新に失敗しました" } }, { status: 500 });
      }

      return NextResponse.json({
        message: "前日報告と出勤記録が正常にリンクされました",
        linked: true,
        previous_day_report_id: updatedReport.id,
        attendance_record_id: attendance_record_id,
        data: updatedReport,
      });
    } catch (error) {
      console.error("前日報告リンクAPI エラー:", error);
      return NextResponse.json({ error: { message: "サーバーエラーが発生しました" } }, { status: 500 });
    }
  });
}

/**
 * 前日報告と出勤記録の関連付けを取得するAPI
 */
export async function GET(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      const { searchParams } = new URL(request.url);
      const date = searchParams.get("date");

      if (!date) {
        return NextResponse.json({ error: { message: "日付パラメータが必要です" } }, { status: 400 });
      }

      // 指定日の前日報告と関連する出勤記録を取得
      const { data: reportWithAttendance, error } = await (supabaseAdmin as any)
        .from("previous_day_reports")
        .select(
          `
          *,
          attendance_records:actual_attendance_record_id (
            id,
            date,
            wake_up_time,
            departure_time,
            arrival_time,
            status
          )
        `
        )
        .eq("user_id", req.user.id)
        .eq("report_date", date)
        .single();

      if (error && error.code !== "PGRST116") {
        console.error("前日報告取得エラー:", error);
        return NextResponse.json({ error: { message: "データベースエラーが発生しました" } }, { status: 500 });
      }

      return NextResponse.json({
        report: reportWithAttendance || null,
        hasReport: !!reportWithAttendance,
        isLinked: !!reportWithAttendance?.actual_attendance_record_id,
      });
    } catch (error) {
      console.error("前日報告取得API エラー:", error);
      return NextResponse.json({ error: { message: "サーバーエラーが発生しました" } }, { status: 500 });
    }
  });
}
