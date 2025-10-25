import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Get attendance record for today
      const { data: attendanceRecord, error: fetchError } = await (supabaseAdmin as any)
        .from("attendance_records")
        .select("*")
        .eq("staff_id", req.user.id)
        .eq("date", today)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        console.error("Error fetching attendance record:", fetchError);
        return NextResponse.json({ error: "出勤記録の取得に失敗しました" }, { status: 500 });
      }

      // If attendance record exists and is complete, create a new reopened record
      if (attendanceRecord && attendanceRecord.status === "complete") {
        // Mark the existing record as reopened (for history tracking)
        await (supabaseAdmin as any)
          .from("attendance_records")
          .update({
            status: "reopened",
            updated_at: new Date().toISOString(),
          })
          .eq("id", attendanceRecord.id);

        // Create a new active record with the same data
        const { error: createError } = await (supabaseAdmin as any).from("attendance_records").insert({
          staff_id: req.user.id,
          date: today,
          status: "active",
          wake_up_time: attendanceRecord.wake_up_time,
          departure_time: attendanceRecord.departure_time,
          arrival_time: attendanceRecord.arrival_time,
          route_photo_url: attendanceRecord.route_photo_url,
          appearance_photo_url: attendanceRecord.appearance_photo_url,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (createError) {
          console.error("Error creating reopened attendance record:", createError);
          return NextResponse.json({ error: "再開記録の作成に失敗しました" }, { status: 500 });
        }
      }

      // Reopen any submitted reports back to draft status
      const { error: reportUpdateError } = await (supabaseAdmin as any)
        .from("daily_reports")
        .update({
          status: "draft",
          submitted_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("staff_id", req.user.id)
        .eq("date", today)
        .eq("status", "submitted");

      if (reportUpdateError) {
        console.error("Error updating daily reports:", reportUpdateError);
        // Don't return error here as this is not critical
      }

      console.log(`Day reopened for user ${req.user.id} on ${today}`);

      return NextResponse.json({
        success: true,
        message: "業務を再開しました",
        reopenedDate: today,
      });
    } catch (error) {
      console.error("Error reopening day:", error);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "業務再開処理に失敗しました",
          },
        },
        { status: 500 }
      );
    }
  });
}
