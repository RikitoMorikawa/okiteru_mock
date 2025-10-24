import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import StaffManagementPage from "@/components/staff/StaffManagementPage";
import { Database } from "@/types/database";

export default async function StaffListPage() {
  const supabase = createServerComponentClient<Database>({ cookies });

  // Check authentication
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/login");
  }

  // Check if user is a manager
  const { data: user } = await supabase.from("users").select("role").eq("id", session.user.id).single();

  if (!user || user.role !== "manager") {
    redirect("/dashboard");
  }

  return <StaffManagementPage />;
}
