import { NextRequest, NextResponse } from "next/server";
import { createStaffMember } from "@/lib/auth-admin";

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, phone, role } = await request.json();

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        {
          error: {
            code: "MISSING_FIELDS",
            message: "メールアドレス、パスワード、名前は必須です",
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
            message: "有効なメールアドレスを入力してください",
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
            message: "パスワードは8文字以上で入力してください",
          },
        },
        { status: 400 }
      );
    }

    // Create user (this will create as staff by default, we'll update role after)
    const user = await createStaffMember(email.toLowerCase().trim(), password, name.trim(), phone?.trim());

    // If role is manager, update the role
    if (role === "manager") {
      const { updateUserRole } = await import("@/lib/auth-admin");
      await updateUserRole(user.id, "manager");
    }

    return NextResponse.json({
      message: "アカウントが正常に作成されました",
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    console.error("Error details:", {
      message: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : "No stack trace",
      name: error instanceof Error ? error.name : "Unknown",
    });

    // Handle specific Supabase errors
    if (error instanceof Error) {
      if (error.message.includes("already registered") || error.message.includes("already exists") || error.message.includes("duplicate key")) {
        return NextResponse.json(
          {
            error: {
              code: "EMAIL_EXISTS",
              message: "このメールアドレスは既に使用されています",
              details: error.message,
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
          message: "アカウントの作成に失敗しました",
          details: error instanceof Error ? error.message : "Unknown error",
        },
      },
      { status: 500 }
    );
  }
}
