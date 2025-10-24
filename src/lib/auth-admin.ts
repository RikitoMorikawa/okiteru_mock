import { supabaseAdmin } from "./supabase-admin";

// Server-side only auth functions that require admin privileges

// Create new staff member (manager only) - Server-side only
export async function createStaffMember(email: string, password: string, name: string, phone?: string) {
  console.log("Creating staff member:", { email, name, phone });

  // Check if user already exists in auth
  const { data: existingAuthUsers } = await supabaseAdmin.auth.admin.listUsers();
  const existingAuthUser = existingAuthUsers.users.find((u) => u.email === email);

  if (existingAuthUser) {
    console.log("User already exists in auth:", existingAuthUser.id);
    // Check if profile exists
    const { data: existingProfile } = await (supabaseAdmin as any)
      .from("users")
      .select("id")
      .eq("id", existingAuthUser.id)
      .single();

    if (existingProfile) {
      throw new Error("このメールアドレスは既に使用されています");
    } else {
      // Auth user exists but profile doesn't - create profile
      console.log("Creating missing profile for existing auth user");
      const { error: profileError } = await (supabaseAdmin as any).from("users").insert({
        id: existingAuthUser.id,
        email,
        role: "staff",
        name,
        phone,
      });

      if (profileError) {
        console.error("Profile creation error:", profileError);
        throw new Error(profileError.message);
      }

      return existingAuthUser;
    }
  }

  // This should be called from an API route with admin privileges
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true, // Auto-confirm email for internal staff
  });

  if (error) {
    console.error("Auth user creation error:", error);
    throw new Error(error.message);
  }

  console.log("Auth user created successfully:", data.user.id);

  // Check if a profile with this ID already exists (orphaned record)
  const { data: orphanedProfile } = await (supabaseAdmin as any)
    .from("users")
    .select("id, email")
    .eq("id", data.user.id)
    .maybeSingle();

  if (orphanedProfile) {
    console.log("Found orphaned profile, updating it instead:", orphanedProfile);
    // Update the orphaned profile instead of inserting
    const { error: updateError } = await (supabaseAdmin as any)
      .from("users")
      .update({
        email,
        role: "staff",
        name,
        phone,
      })
      .eq("id", data.user.id);

    if (updateError) {
      console.error("Profile update error:", updateError);
      // Clean up auth user if profile update fails
      try {
        await supabaseAdmin.auth.admin.deleteUser(data.user.id);
        console.log("Cleaned up auth user after profile update failure");
      } catch (cleanupError) {
        console.error("Failed to clean up auth user:", cleanupError);
      }
      throw new Error(updateError.message);
    }

    console.log("Orphaned profile updated successfully");
    return data.user;
  }

  // Create user profile
  const { error: profileError } = await (supabaseAdmin as any).from("users").insert({
    id: data.user.id,
    email,
    role: "staff",
    name,
    phone,
  });

  if (profileError) {
    console.error("Profile creation error:", profileError);
    // Clean up auth user if profile creation fails
    try {
      await supabaseAdmin.auth.admin.deleteUser(data.user.id);
      console.log("Cleaned up auth user after profile creation failure");
    } catch (cleanupError) {
      console.error("Failed to clean up auth user:", cleanupError);
    }
    throw new Error(profileError.message);
  }

  console.log("User profile created successfully");
  return data.user;
}

// Delete user (admin only) - Server-side only
export async function deleteUser(userId: string) {
  const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);

  if (error) {
    throw new Error(error.message);
  }
}

// Get all users (admin only) - Server-side only
export async function getAllUsers() {
  const { data, error } = await (supabaseAdmin as any).from("users").select("*").order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

// Update user role (admin only) - Server-side only
export async function updateUserRole(userId: string, role: "manager" | "staff") {
  const { data, error } = await (supabaseAdmin as any).from("users").update({ role }).eq("id", userId).select().single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
