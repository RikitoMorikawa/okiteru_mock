import { supabase } from "./supabase";
import { User } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email: string;
  role: "manager" | "staff";
  name: string;
  phone?: string;
}

// Get current user with profile data
export async function getCurrentUser(): Promise<AuthUser | null> {
  console.log("[getCurrentUser] Starting...");
  try {
    // Use getSession instead of getUser for faster, cached access
    console.log("[getCurrentUser] Calling supabase.auth.getSession()...");
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.getSession();

    console.log("[getCurrentUser] getSession() completed");

    if (sessionError) {
      console.error("[getCurrentUser] Error getting session:", sessionError);
      return null;
    }

    if (!session?.user) {
      console.log("[getCurrentUser] No session found");
      return null;
    }

    const user = session.user;
    console.log("[getCurrentUser] Session user found:", user.id);
    console.log("[getCurrentUser] Fetching profile for user:", user.id);

    // Get user profile from our users table
    console.log("[getCurrentUser] Calling supabase.from('users').select()...");
    const { data: profile, error: profileError } = await supabase.from("users").select("*").eq("id", user.id).single();

    console.log("[getCurrentUser] Profile query completed");

    if (profileError) {
      console.error("[getCurrentUser] Error getting user profile:", profileError);
      console.error("[getCurrentUser] Profile error details:", {
        code: profileError.code,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
      });
      return null;
    }

    if (!profile) {
      console.error("[getCurrentUser] No profile found for user:", user.id);
      return null;
    }

    console.log("[getCurrentUser] User profile loaded successfully:", profile);

    const result = {
      id: (profile as any).id,
      email: (profile as any).email,
      role: (profile as any).role,
      name: (profile as any).name,
      phone: (profile as any).phone,
    };

    console.log("[getCurrentUser] Returning user:", result);
    return result;
  } catch (error) {
    console.error("[getCurrentUser] Exception caught:", error);
    return null;
  }
}

// Sign in with email and password
export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Sign out
export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

// Create new staff member (manager only) - This should be called from API routes only
export async function createStaffMember(email: string, password: string, name: string, phone?: string) {
  // This function should only be called from API routes where supabaseAdmin is available
  throw new Error("createStaffMember should only be called from API routes");
}

// Update user profile
export async function updateUserProfile(userId: string, updates: Partial<Pick<AuthUser, "name" | "phone">>): Promise<AuthUser | null> {
  const { data, error } = await (supabase as any).from("users").update(updates).eq("id", userId).select().single();

  if (error) {
    throw new Error(error.message);
  }

  return data as AuthUser;
}

// Check if user is manager
export async function isManager(userId?: string): Promise<boolean> {
  try {
    const user = userId ? { id: userId } : await getCurrentUser();
    if (!user) return false;

    const { data, error } = await supabase.from("users").select("role").eq("id", user.id).single();

    if (error) return false;

    return (data as any)?.role === "manager";
  } catch {
    return false;
  }
}

// Log user access
export async function logUserAccess(userId: string, ipAddress?: string, userAgent?: string) {
  console.log("[logUserAccess] Attempting to log access for user:", userId);

  const logData = {
    user_id: userId,
    login_time: new Date().toISOString(),
    ip_address: ipAddress,
    user_agent: userAgent,
  };

  console.log("[logUserAccess] Log data:", logData);

  const { data, error } = await (supabase as any).from("access_logs").insert(logData);

  if (error) {
    console.error("[logUserAccess] Error logging user access:", error);
    console.error("[logUserAccess] Error details:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
  } else {
    console.log("[logUserAccess] Successfully logged user access:", data);
  }
}

// Update logout time in access log
export async function logUserLogout(userId: string) {
  // Get the most recent login without logout time
  const { data: recentLog } = await supabase
    .from("access_logs")
    .select("id")
    .eq("user_id", userId)
    .is("logout_time", null)
    .order("login_time", { ascending: false })
    .limit(1)
    .single();

  if (recentLog) {
    const { error } = await (supabase as any)
      .from("access_logs")
      .update({ logout_time: new Date().toISOString() })
      .eq("id", (recentLog as any).id);

    if (error) {
      console.error("Error logging user logout:", error);
    }
  }
}
