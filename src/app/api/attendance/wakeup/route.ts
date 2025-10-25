import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

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
      const { data: existingRecord } = await supabaseAdmin
        .from("attendance_records")
        .select("id, wake_up_time")
        .eq("staff_id", req.user.id)
        .eq("date", dateStr)
        .single();

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

        // Update existing record with wake up time and notes
        const updateData: any = {
          wake_up_time: wakeUpDate.toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Add notes if provided and column exists
        if (notes && notes.trim()) {
          updateData.notes = notes.trim();
        }

        const { data: updatedRecord, error: updateError } = await supabaseAdmin
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

        return NextResponse.json({
          message: "起床時間が記録されました",
          record: updatedRecord,
        });
      }

      // Create new attendance record
      const { data: newRecord, error: insertError } = await supabaseAdmin
        .from("attendance_records")
        .insert({
          staff_id: req.user.id,
          date: dateStr,
          wake_up_time: wakeUpDate.toISOString(),
          status: "partial", // Will be updated as more data is added
        })
        .select()
        .single();

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
