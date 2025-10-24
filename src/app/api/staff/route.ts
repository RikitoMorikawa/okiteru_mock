import { NextRequest, NextResponse } from "next/server";
import { withManagerAuth } from "@/lib/middleware/auth";
import { createStaffMember } from "@/lib/auth-admin";
import { supabase } from "@/lib/supabase";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withManagerAuth(request, async (req) => {
    try {
      const { email, password, name, phone } = await request.json();

      // Validate required fields
      if (!email || !password || !name) {
        return NextResponse.json(
          {
            error: {
              code: "MISSING_FIELDS",
              message: "Email, password, and name are required",
            },
          },
          { status: 400 }
        );
      }

      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_EMAIL",
              message: "Invalid email format",
            },
          },
          { status: 400 }
        );
      }

      // Validate password strength
      if (password.length < 8) {
        return NextResponse.json(
          {
            error: {
              code: "WEAK_PASSWORD",
              message: "Password must be at least 8 characters long",
            },
          },
          { status: 400 }
        );
      }

      // Validate name
      if (name.trim().length < 2) {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_NAME",
              message: "Name must be at least 2 characters long",
            },
          },
          { status: 400 }
        );
      }

      // Create staff member
      const user = await createStaffMember(email.toLowerCase().trim(), password, name.trim(), phone?.trim());

      return NextResponse.json({
        message: "Staff member created successfully",
        user: {
          id: user.id,
          email: user.email,
        },
      });
    } catch (error) {
      console.error("Create staff error:", error);

      // Handle specific Supabase errors
      if (error instanceof Error) {
        if (error.message.includes("already registered")) {
          return NextResponse.json(
            {
              error: {
                code: "EMAIL_EXISTS",
                message: "このメールアドレスは既に使用されています",
              },
            },
            { status: 409 }
          );
        }
      }

      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "スタッフの作成に失敗しました",
          },
        },
        { status: 500 }
      );
    }
  });
}

export async function GET(request: NextRequest) {
  return withManagerAuth(request, async (req) => {
    try {
      // Fetch all staff members
      const { data: staff, error } = await supabase.from("users").select("*").eq("role", "staff").order("name");

      if (error) {
        console.error("Database error:", error);
        return NextResponse.json(
          {
            error: {
              code: "DATABASE_ERROR",
              message: "スタッフリストの取得に失敗しました",
            },
          },
          { status: 500 }
        );
      }

      return NextResponse.json({ staff });
    } catch (error) {
      console.error("Get staff error:", error);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to get staff list",
          },
        },
        { status: 500 }
      );
    }
  });
}
