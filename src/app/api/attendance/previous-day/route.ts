import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // ユーザー認証確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

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

    // 今日の日付を取得
    const today = new Date();
    const todayDateString = today.toISOString().split("T")[0];

    // 既存の前日報告があるかチェック
    const { data: existingReport, error: checkError } = await supabase
      .from("previous_day_reports")
      .select("id")
      .eq("user_id", user.id)
      .eq("report_date", todayDateString)
      .single();

    if (checkError && checkError.code !== "PGRST116") {
      console.error("前日報告チェックエラー:", checkError);
      return NextResponse.json({ error: { message: "データベースエラーが発生しました" } }, { status: 500 });
    }

    const reportData = {
      user_id: user.id,
      report_date: todayDateString,
      next_wake_up_time,
      next_departure_time,
      next_arrival_time,
      appearance_photo_url,
      route_photo_url,
      notes: notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let result;
    if (existingReport) {
      // 既存の報告を更新
      const { data, error } = await supabase
        .from("previous_day_reports")
        .update({
          next_wake_up_time,
          next_departure_time,
          next_arrival_time,
          appearance_photo_url,
          route_photo_url,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingReport.id)
        .select()
        .single();

      if (error) {
        console.error("前日報告更新エラー:", error);
        return NextResponse.json({ error: { message: "前日報告の更新に失敗しました" } }, { status: 500 });
      }
      result = data;
    } else {
      // 新しい報告を作成
      const { data, error } = await supabase.from("previous_day_reports").insert(reportData).select().single();

      if (error) {
        console.error("前日報告作成エラー:", error);
        return NextResponse.json({ error: { message: "前日報告の作成に失敗しました" } }, { status: 500 });
      }
      result = data;
    }

    return NextResponse.json({
      message: "前日報告が正常に送信されました",
      data: result,
    });
  } catch (error) {
    console.error("前日報告API エラー:", error);
    return NextResponse.json({ error: { message: "サーバーエラーが発生しました" } }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // ユーザー認証確認
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // 今日の日付を取得
    const today = new Date();
    const todayDateString = today.toISOString().split("T")[0];

    // 今日の前日報告を取得
    const { data: report, error } = await supabase.from("previous_day_reports").select("*").eq("user_id", user.id).eq("report_date", todayDateString).single();

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
}
