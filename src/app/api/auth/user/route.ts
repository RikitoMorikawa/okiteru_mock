import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      return NextResponse.json({ user: req.user });
    } catch (error) {
      console.error("Get user error:", error);
      return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Failed to get user" } }, { status: 500 });
    }
  });
}
