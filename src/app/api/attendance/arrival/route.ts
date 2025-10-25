import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      const { arrival_time, location, notes } = await request.json();

      // Validate required fields
      if (!arrival_time) {
        return NextResponse.json(
          {
            error: {
              code: "MISSING_ARRIVAL_TIME",
              message: "到着時間は必須です",
            },
          },
          { status: 400 }
        );
      }

      // Validate arrival_time format
      const arrivalDate = new Date(arrival_time);
      if (isNaN(arrivalDate.getTime())) {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_ARRIVAL_TIME",
              message: "有効な到着時間を入力してください",
            },
          },
          { status: 400 }
        );
      }

      // Get today's date for the attendance record
      const today = new Date();
      const dateStr = today.toISOString().split("T")[0]; // YYYY-MM-DD format

      // Check if attendance record exists for today
      const { data: existingRecord } = await (supabaseAdmin as any)
        .from("attendance_records")
        .select("id, arrival_time, wake_up_time, departure_time")
        .eq("staff_id", req.user.id)
        .eq("date", dateStr)
        .single();

      if (existingRecord) {
        if (existingRecord.arrival_time) {
          return NextResponse.json(
            {
              error: {
                code: "ARRIVAL_ALREADY_RECORDED",
                message: "本日の到着時間は既に記録されています",
              },
            },
            { status: 409 }
          );
        }

        // Update existing record with arrival time
        const updateData: any = {
          arrival_time: arrivalDate.toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (location && location.trim()) {
          updateData.location = location.trim();
        }

        if (notes && notes.trim()) {
          updateData.notes = notes.trim();
        }

        // Check if all attendance items are complete
        const isComplete = existingRecord.wake_up_time && existingRecord.departure_time && arrivalDate;

        if (isComplete) {
          updateData.status = "complete";
        }

        const { data: updatedRecord, error: updateError } = await (supabaseAdmin as any)
          .from("attendance_records")
          .update(updateData)
          .eq("id", existingRecord.id)
          .select()
          .single();

        if (updateError) {
          console.error("Arrival time update error:", updateError);
          return NextResponse.json(
            {
              error: {
                code: "UPDATE_FAILED",
                message: "到着時間の更新に失敗しました",
              },
            },
            { status: 500 }
          );
        }

        return NextResponse.json({
          message: "到着時間が記録されました",
          record: updatedRecord,
        });
      }

      // Create new attendance record
      const insertData: any = {
        staff_id: req.user.id,
        date: dateStr,
        arrival_time: arrivalDate.toISOString(),
        status: "partial",
      };

      if (location && location.trim()) {
        insertData.location = location.trim();
      }

      if (notes && notes.trim()) {
        insertData.notes = notes.trim();
      }

      const { data: newRecord, error: insertError } = await (supabaseAdmin as any).from("attendance_records").insert(insertData).select().single();

      if (insertError) {
        console.error("Arrival time insert error:", insertError);
        return NextResponse.json(
          {
            error: {
              code: "INSERT_FAILED",
              message: "到着時間の記録に失敗しました",
            },
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: "到着時間が記録されました",
        record: newRecord,
      });
    } catch (error) {
      console.error("Arrival API error:", error);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "到着時間の記録に失敗しました",
          },
        },
        { status: 500 }
      );
    }
  });
}
