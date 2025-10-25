import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      const body = await request.json();
      const { content, workHours, achievements, challenges, tomorrow } = body;

      // Validate required fields
      if (!content) {
        return NextResponse.json(
          {
            error: {
              code: "VALIDATION_ERROR",
              message: "業務内容は必須です",
            },
          },
          { status: 400 }
        );
      }

      // Get today's date
      const today = new Date();
      const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD format

      // Mark any existing active reports as superseded (for history tracking)
      const { data: existingReports } = await (supabaseAdmin as any)
        .from("daily_reports")
        .select("id")
        .eq("staff_id", req.user.id)
        .eq("date", dateStr)
        .in("status", ["draft", "submitted"]);

      if (existingReports && existingReports.length > 0) {
        await (supabaseAdmin as any)
          .from("daily_reports")
          .update({
            status: "superseded",
            updated_at: new Date().toISOString(),
          })
          .eq("staff_id", req.user.id)
          .eq("date", dateStr)
          .in("status", ["draft", "submitted"]);
      }

      // Always create a new report
      const { data: newReport, error: insertError } = await (supabaseAdmin as any)
        .from("daily_reports")
        .insert({
          staff_id: req.user.id,
          date: dateStr,
          content,
          work_hours: workHours,
          achievements,
          challenges,
          tomorrow_plan: tomorrow,
          status: "submitted",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (insertError) {
        console.error("Create daily report error:", insertError);
        return NextResponse.json(
          {
            error: {
              code: "DATABASE_ERROR",
              message: "日報の作成に失敗しました",
            },
          },
          { status: 500 }
        );
      }

      // Check if attendance record exists and update status if all tasks are complete
      const { data: attendanceRecord } = await (supabaseAdmin as any)
        .from("attendance_records")
        .select("id, wake_up_time, departure_time, arrival_time, status")
        .eq("staff_id", req.user.id)
        .eq("date", dateStr)
        .in("status", ["pending", "partial", "active"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      // If attendance record exists and all tasks are complete, mark as complete
      if (attendanceRecord && attendanceRecord.wake_up_time && attendanceRecord.departure_time && attendanceRecord.arrival_time) {
        await (supabaseAdmin as any)
          .from("attendance_records")
          .update({
            status: "complete",
            updated_at: new Date().toISOString(),
          })
          .eq("id", attendanceRecord.id);
      }

      return NextResponse.json({
        message: "日報を提出しました",
        reportId: newReport.id,
      });
    } catch (error) {
      console.error("Daily report submission error:", error);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "日報の提出に失敗しました",
          },
        },
        { status: 500 }
      );
    }
  });
}

export async function GET(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      // Get today's date
      const today = new Date();
      const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD format

      // Get the latest active daily report for today (exclude archived and superseded reports)
      const { data: dailyReports, error } = await (supabaseAdmin as any)
        .from("daily_reports")
        .select("*")
        .eq("staff_id", req.user.id)
        .eq("date", dateStr)
        .in("status", ["draft", "submitted"])
        .order("created_at", { ascending: false });

      const dailyReport = dailyReports?.[0] || null;

      if (error && error.code !== "PGRST116") {
        // PGRST116 is "not found" error, which is expected if no report exists
        console.error("Get daily report error:", error);
        return NextResponse.json(
          {
            error: {
              code: "DATABASE_ERROR",
              message: "日報の取得に失敗しました",
            },
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        report: dailyReport || null,
      });
    } catch (error) {
      console.error("Get daily report error:", error);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "日報の取得に失敗しました",
          },
        },
        { status: 500 }
      );
    }
  });
}
