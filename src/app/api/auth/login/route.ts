import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import { logUserAccess } from "@/lib/auth";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: { code: "MISSING_FIELDS", message: "Email and password are required" } }, { status: 400 });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: { code: "AUTH_ERROR", message: error.message } }, { status: 401 });
    }

    if (data.user) {
      // Log user access
      const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown";
      const userAgent = request.headers.get("user-agent") || "unknown";

      await logUserAccess(data.user.id, ipAddress, userAgent);
    }

    return NextResponse.json({
      user: data.user,
      session: data.session,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Login failed" } }, { status: 500 });
  }
}
