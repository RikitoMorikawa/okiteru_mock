import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      const { departure_time, destination, route_photo_url, appearance_photo_url, notes } = await request.json();

      // Validate required fields
      if (!departure_time) {
        return NextResponse.json(
          {
            error: {
              code: "MISSING_DEPARTURE_TIME",
              message: "出発時間は必須です",
            },
          },
          { status: 400 }
        );
      }

      // Validate departure_time format
      const departureDate = new Date(departure_time);
      if (isNaN(departureDate.getTime())) {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_DEPARTURE_TIME",
              message: "有効な出発時間を入力してください",
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
        .select("id, departure_time")
        .eq("staff_id", req.user.id)
        .eq("date", dateStr)
        .single();

      if (existingRecord) {
        if (existingRecord.departure_time) {
          return NextResponse.json(
            {
              error: {
                code: "DEPARTURE_ALREADY_RECORDED",
                message: "本日の出発時間は既に記録されています",
              },
            },
            { status: 409 }
          );
        }

        // Update existing record with departure time
        const updateData: any = {
          departure_time: departureDate.toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (route_photo_url) {
          updateData.route_photo_url = route_photo_url;
        }

        if (appearance_photo_url) {
          updateData.appearance_photo_url = appearance_photo_url;
        }

        if (destination && destination.trim()) {
          updateData.destination = destination.trim();
        }

        if (notes && notes.trim()) {
          updateData.departure_notes = notes.trim();
        }

        const { data: updatedRecord, error: updateError } = await (supabaseAdmin as any)
          .from("attendance_records")
          .update(updateData)
          .eq("id", existingRecord.id)
          .select()
          .single();

        if (updateError) {
          console.error("Departure time update error:", updateError);
          return NextResponse.json(
            {
              error: {
                code: "UPDATE_FAILED",
                message: "出発時間の更新に失敗しました",
              },
            },
            { status: 500 }
          );
        }

        return NextResponse.json({
          message: "出発時間が記録されました",
          record: updatedRecord,
        });
      }

      // Create new attendance record
      const insertData: any = {
        staff_id: req.user.id,
        date: dateStr,
        departure_time: departureDate.toISOString(),
        status: "partial",
      };

      if (route_photo_url) {
        insertData.route_photo_url = route_photo_url;
      }

      if (appearance_photo_url) {
        insertData.appearance_photo_url = appearance_photo_url;
      }

      if (destination && destination.trim()) {
        insertData.destination = destination.trim();
      }

      if (notes && notes.trim()) {
        insertData.departure_notes = notes.trim();
      }

      const { data: newRecord, error: insertError } = await (supabaseAdmin as any).from("attendance_records").insert(insertData).select().single();

      if (insertError) {
        console.error("Departure time insert error:", insertError);
        return NextResponse.json(
          {
            error: {
              code: "INSERT_FAILED",
              message: "出発時間の記録に失敗しました",
            },
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: "出発時間が記録されました",
        record: newRecord,
      });
    } catch (error) {
      console.error("Departure API error:", error);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "出発時間の記録に失敗しました",
          },
        },
        { status: 500 }
      );
    }
  });
}
