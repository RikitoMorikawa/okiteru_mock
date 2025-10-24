import { redirect } from "next/navigation";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import StaffHistoryPage from "@/components/staff/StaffHistoryPage";
import { Database } from "@/types/database";

interface StaffHistoryPageProps {
  params: {
    id: string;
  };
}

export default async function StaffHistory({ params }: StaffHistoryPageProps) {
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

  // Verify staff member exists
  const { data: staffMember } = await supabase.from("users").select("*").eq("id", params.id).eq("role", "staff").single();

  if (!staffMember) {
    redirect("/manager");
  }

  return <StaffHistoryPage staffId={params.id} staffName={staffMember.name} />;
}
