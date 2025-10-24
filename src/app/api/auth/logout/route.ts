import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/middleware/auth";
import { logUserLogout } from "@/lib/auth";
import { supabase } from "@/lib/supabase";

// Force dynamic rendering for this route
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  return withAuth(request, async (req) => {
    try {
      // Log user logout
      await logUserLogout(req.user.id);

      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();

      if (error) {
        return NextResponse.json({ error: { code: "LOGOUT_ERROR", message: error.message } }, { status: 500 });
      }

      return NextResponse.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Logout failed" } }, { status: 500 });
    }
  });
}
