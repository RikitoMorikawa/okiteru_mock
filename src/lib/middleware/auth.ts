import { NextRequest, NextResponse } from "next/server";
import { supabase } from "../supabase";
import { supabaseAdmin } from "../supabase-admin";
import { AuthUser } from "../auth";

export interface AuthenticatedRequest extends NextRequest {
  user: AuthUser;
}

// Middleware to verify authentication
export async function withAuth(request: NextRequest, handler: (req: AuthenticatedRequest) => Promise<NextResponse>): Promise<NextResponse> {
  try {
    // Get the authorization header
    const authHeader = request.headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Missing or invalid authorization header" } }, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify the JWT token
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return NextResponse.json({ error: { code: "UNAUTHORIZED", message: "Invalid or expired token" } }, { status: 401 });
    }

    // Get user profile using admin client to bypass RLS
    console.log("[withAuth] Looking for profile with user ID:", user.id);
    const { data: profile, error: profileError } = await (supabaseAdmin as any).from("users").select("*").eq("id", user.id).single();

    console.log("[withAuth] Profile query result:", { profile, profileError });

    if (profileError || !profile) {
      console.error("[withAuth] Profile not found:", { userId: user.id, profileError });
      return NextResponse.json({ error: { code: "USER_NOT_FOUND", message: "User profile not found" } }, { status: 404 });
    }

    // Add user to request
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.user = {
      id: (profile as any).id,
      email: (profile as any).email,
      role: (profile as any).role,
      name: (profile as any).name,
      phone: (profile as any).phone,
    };

    return handler(authenticatedRequest);
  } catch (error) {
    console.error("Auth middleware error:", error);
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Authentication failed" } }, { status: 500 });
  }
}

// Middleware to verify manager role
export async function withManagerAuth(request: NextRequest, handler: (req: AuthenticatedRequest) => Promise<NextResponse>): Promise<NextResponse> {
  return withAuth(request, async (req) => {
    if (req.user.role !== "manager") {
      return NextResponse.json({ error: { code: "FORBIDDEN", message: "Manager access required" } }, { status: 403 });
    }
    return handler(req);
  });
}

// Helper function to get user from request headers (for client-side)
export async function getUserFromHeaders(headers: Headers): Promise<AuthUser | null> {
  try {
    const authHeader = headers.get("authorization");

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return null;
    }

    const token = authHeader.substring(7);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return null;
    }

    const { data: profile, error: profileError } = await supabase.from("users").select("*").eq("id", user.id).single();

    if (profileError || !profile) {
      return null;
    }

    return {
      id: (profile as any).id,
      email: (profile as any).email,
      role: (profile as any).role,
      name: (profile as any).name,
      phone: (profile as any).phone,
    };
  } catch {
    return null;
  }
}
