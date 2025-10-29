import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Helper function to link unused previous day report to attendance record
async function linkPreviousDayReport(userId: string, attendanceRecordId: string) {
  try {
    // Find the most recent unused previous day report
    const { data: unusedReport } = await (supabaseAdmin as any)
      .from("previous_day_reports")
      .select("id")
      .eq("user_id", userId)
      .is("actual_attendance_record_id", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (unusedReport) {
      // Link the report to the attendance record
      const { error: linkError } = await (supabaseAdmin as any)
        .from("previous_day_reports")
        .update({
          actual_attendance_record_id: attendanceRecordId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", unusedReport.id);

      if (linkError) {
        console.error("Error linking previous day report:", linkError);
      } else {
        console.log(`Successfully linked previous day report ${unusedReport.id} to attendance record ${attendanceRecordId}`);
      }
    }
  } catch (error) {
    console.error("Error in linkPreviousDayReport:", error);
  }
}

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      const { wake_up_time, notes } = await request.json();

      // Validate required fields
      if (!wake_up_time) {
        return NextResponse.json(
          {
            error: {
              code: "MISSING_WAKE_UP_TIME",
              message: "起床時間は必須です",
            },
          },
          { status: 400 }
        );
      }

      // Validate wake_up_time format
      const wakeUpDate = new Date(wake_up_time);
      if (isNaN(wakeUpDate.getTime())) {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_WAKE_UP_TIME",
              message: "有効な起床時間を入力してください",
            },
          },
          { status: 400 }
        );
      }

      // Get today's date for the attendance record
      const today = new Date();
      const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD format

      // Check if attendance record already exists for today
      const { data: existingRecords } = await (supabaseAdmin as any)
        .from("attendance_records")
        .select("id, wake_up_time")
        .eq("staff_id", req.user.id)
        .eq("date", dateStr)
        .in("status", ["pending", "partial", "active"])
        .order("created_at", { ascending: false });

      const existingRecord = existingRecords?.[0] || null;

      if (existingRecord) {
        if (existingRecord.wake_up_time) {
          return NextResponse.json(
            {
              error: {
                code: "WAKE_UP_ALREADY_RECORDED",
                message: "本日の起床時間は既に記録されています",
              },
            },
            { status: 409 }
          );
        }

        // Update existing record with wake up time, location and notes
        const updateData: any = {
          wake_up_time: wakeUpDate.toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Add wake up notes if provided
        if (notes && notes.trim()) {
          updateData.wake_up_notes = notes.trim();
        }

        const { data: updatedRecord, error: updateError } = await (supabaseAdmin as any)
          .from("attendance_records")
          .update(updateData)
          .eq("id", existingRecord.id)
          .select()
          .single();

        if (updateError) {
          console.error("Wake up time update error:", updateError);
          return NextResponse.json(
            {
              error: {
                code: "UPDATE_FAILED",
                message: "起床時間の更新に失敗しました",
              },
            },
            { status: 500 }
          );
        }

        // Link unused previous day report to this attendance record
        await linkPreviousDayReport(req.user.id, updatedRecord.id);

        return NextResponse.json({
          message: "起床時間が記録されました",
          record: updatedRecord,
        });
      }

      // Create new attendance record
      const insertData: any = {
        staff_id: req.user.id,
        date: dateStr,
        wake_up_time: wakeUpDate.toISOString(),
        status: "partial", // Will be updated as more data is added
      };

      // Add wake up notes if provided
      if (notes && notes.trim()) {
        insertData.wake_up_notes = notes.trim();
      }

      const { data: newRecord, error: insertError } = await (supabaseAdmin as any).from("attendance_records").insert(insertData).select().single();

      if (insertError) {
        console.error("Wake up time insert error:", insertError);
        return NextResponse.json(
          {
            error: {
              code: "INSERT_FAILED",
              message: "起床時間の記録に失敗しました",
            },
          },
          { status: 500 }
        );
      }

      // Link unused previous day report to this attendance record
      await linkPreviousDayReport(req.user.id, newRecord.id);

      return NextResponse.json({
        message: "起床時間が記録されました",
        record: newRecord,
      });
    } catch (error) {
      console.error("Wake up API error:", error);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "起床時間の記録に失敗しました",
          },
        },
        { status: 500 }
      );
    }
  });
}
