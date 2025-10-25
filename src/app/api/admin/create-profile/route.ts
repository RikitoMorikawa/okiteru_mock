import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { userId, email, name, role } = await request.json();

    if (!userId || !email || !name || !role) {
      return NextResponse.json(
        {
          error: {
            code: "MISSING_FIELDS",
            message: "userId, email, name, and role are required",
          },
        },
        { status: 400 }
      );
    }

    // Check if profile already exists
    const { data: existingProfile } = await supabaseAdmin.from("users").select("id").eq("id", userId).single();

    if (existingProfile) {
      return NextResponse.json(
        {
          error: {
            code: "PROFILE_EXISTS",
            message: "Profile already exists for this user",
          },
        },
        { status: 409 }
      );
    }

    // Create user profile
    const { data, error } = await supabaseAdmin
      .from("users")
      .insert({
        id: userId,
        email,
        role,
        name,
        phone: null,
      })
      .select()
      .single();

    if (error) {
      console.error("Profile creation error:", error);
      return NextResponse.json(
        {
          error: {
            code: "PROFILE_CREATION_FAILED",
            message: "Failed to create user profile",
            details: error.message,
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "User profile created successfully",
      profile: data,
    });
  } catch (error) {
    console.error("Create profile error:", error);
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
