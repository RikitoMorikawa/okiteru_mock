import { NextRequest, NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { Database } from "@/types/database";

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createRouteHandlerClient<Database>({ cookies });

    // Check authentication
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
    }

    // Check if user is a manager
    const { data: user } = await supabase.from("users").select("role").eq("id", session.user.id).single();

    if (!user || user.role !== "manager") {
      return NextResponse.json({ error: "管理者権限が必要です" }, { status: 403 });
    }

    // Get the active status from request body
    const { active } = await request.json();

    if (typeof active !== "boolean") {
      return NextResponse.json({ error: "activeステータスはboolean値である必要があります" }, { status: 400 });
    }

    // Update the staff member's active status
    const { data, error } = await supabase.from("users").update({ active }).eq("id", params.id).eq("role", "staff").select().single();

    if (error) {
      console.error("Error updating active status:", error);
      return NextResponse.json({ error: "activeステータスの更新に失敗しました" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "スタッフが見つかりません" }, { status: 404 });
    }

    return NextResponse.json({
      message: "activeステータスを更新しました",
      user: data,
    });
  } catch (error) {
    console.error("Error in active status update:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
