import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    // Add notes column to attendance_records table
    const { error } = await (supabaseAdmin as any).rpc("exec_sql", {
      sql: "ALTER TABLE public.attendance_records ADD COLUMN IF NOT EXISTS notes TEXT;",
    });

    if (error) {
      console.error("Migration error:", error);
      return NextResponse.json(
        {
          error: {
            code: "MIGRATION_FAILED",
            message: "Migration failed",
            details: error.message,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Migration completed successfully",
    });
  } catch (error) {
    console.error("Migration error:", error);
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Internal server error",
        },
      },
      { status: 500 }
    );
  }
}
