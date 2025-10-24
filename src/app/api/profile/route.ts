import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import { updateUserProfile } from "@/lib/auth";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function PUT(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      const { name, phone } = await request.json();

      // Validate required fields
      if (!name || typeof name !== "string") {
        return NextResponse.json(
          {
            error: {
              code: "MISSING_NAME",
              message: "Name is required",
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

      // Validate phone if provided
      if (phone && typeof phone === "string" && phone.trim() && !/^[\d-+().\s]+$/.test(phone.trim())) {
        return NextResponse.json(
          {
            error: {
              code: "INVALID_PHONE",
              message: "Invalid phone number format",
            },
          },
          { status: 400 }
        );
      }

      // Update user profile
      const updatedUser = await updateUserProfile(req.user.id, {
        name: name.trim(),
        phone: phone && typeof phone === "string" ? phone.trim() || undefined : undefined,
      });

      if (!updatedUser) {
        return NextResponse.json(
          {
            error: {
              code: "UPDATE_FAILED",
              message: "Failed to update profile",
            },
          },
          { status: 500 }
        );
      }

      return NextResponse.json({
        message: "Profile updated successfully",
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          role: updatedUser.role,
          name: updatedUser.name,
          phone: updatedUser.phone,
        },
      });
    } catch (error) {
      console.error("Update profile error:", error);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "プロフィールの更新に失敗しました",
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
      return NextResponse.json({
        user: {
          id: req.user.id,
          email: req.user.email,
          role: req.user.role,
          name: req.user.name,
          phone: req.user.phone,
        },
      });
    } catch (error) {
      console.error("Get profile error:", error);
      return NextResponse.json(
        {
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to get profile",
          },
        },
        { status: 500 }
      );
    }
  });
}
